import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { toProgramDraft } from '../app/utils/programForm'
import { earnVisit } from './earnVisit'

function setupWithBackend() {
  const { backend } = makeBackend()
  return { backend, services: createMockMerchantServices(backend, staticSession(barbershopSession)) }
}

function setup() {
  return setupWithBackend().services
}

describe('mock ProgramService', () => {
  it('counts the shop cards that lock the program mode', async () => {
    const services = setup()
    const result = await services.program.countActiveCards()
    expect(result.ok && result.value).toBeGreaterThan(0)
  })

  it('lets the merchant switch stamps to points even with customers holding cards (no mode lock)', async () => {
    const services = setup()
    const current = await services.program.getProgram()
    if (!current.ok) throw new Error(current.error.code)
    const draft = { ...toProgramDraft(current.value), rules: { mode: 'pointsPerVisit' as const, pointsPerVisit: 10, target: 100 } }
    const result = await services.program.updateProgram(draft)
    expect(result).toMatchObject({ ok: true, value: { rules: { mode: 'pointsPerVisit' } } })
  })

  it('applies a new target to cards in progress', async () => {
    const { backend, services } = setupWithBackend()
    const current = await services.program.getProgram()
    if (!current.ok) throw new Error(current.error.code)
    const draft = { ...toProgramDraft(current.value), rules: { mode: 'stamps' as const, target: 12 }, reward: { title: 'Corte e barba' } }
    const saved = await services.program.updateProgram(draft)
    expect(saved.ok && saved.value.rules.target).toBe(12)

    const visit = await earnVisit(backend, services, EXAMPLE_IDS.customers.joao)
    expect(visit.card.target).toBe(12)
  })
})

describe('mock ProgramService target changes', () => {
  async function editProgram(services: ReturnType<typeof setup>, change: (draft: ReturnType<typeof toProgramDraft>) => ReturnType<typeof toProgramDraft>) {
    const current = await services.program.getProgram()
    if (!current.ok) throw new Error(current.error.code)
    return services.program.updateProgram(change(toProgramDraft(current.value)))
  }

  it('rejects rules that only the server can be trusted to enforce', async () => {
    const services = setup()
    const noDate = await editProgram(services, (draft) => ({
      ...draft,
      bonusRules: { ...draft.bonusRules, surpriseDay: { enabled: true, multiplier: 2, date: null } },
    }))
    expect(noDate).toEqual({ ok: false, error: { code: 'invalidProgram' } })

    const freeReward = await editProgram(services, (draft) => ({
      ...draft,
      rules: { mode: 'stamps', target: 3 },
      bonusRules: { ...draft.bonusRules, welcomeBonus: { enabled: true, units: 3 } },
    }))
    expect(freeReward).toEqual({ ok: false, error: { code: 'invalidProgram' } })
  })

  it('never takes away a reward that was already unlocked', async () => {
    const services = setup()
    // Meta 8 libera quem tem 8 ou 9 carimbos (Ana e Maria no seed).
    await editProgram(services, (draft) => ({ ...draft, rules: { mode: 'stamps', target: 8 } }))
    const unlocked = await services.customers.listCustomers('rewardReady')
    if (!unlocked.ok) throw new Error(unlocked.error.code)
    expect(unlocked.value.length).toBeGreaterThan(0)

    await editProgram(services, (draft) => ({ ...draft, rules: { mode: 'stamps', target: 20 } }))

    const after = await services.customers.listCustomers('rewardReady')
    if (!after.ok) throw new Error(after.error.code)
    expect(after.value.map((row) => row.customerId).sort()).toEqual(unlocked.value.map((row) => row.customerId).sort())
    expect(after.value.every((row) => row.target === 8)).toBe(true)
  })

  it('unlocks the reward with a fresh hold when the target drops below the balance', async () => {
    const services = setup()
    await editProgram(services, (draft) => ({ ...draft, rules: { mode: 'stamps', target: 3 }, bonusRules: { ...draft.bonusRules, welcomeBonus: { enabled: true, units: 2 } } }))
    const ready = await services.customers.listCustomers('rewardReady')
    const all = await services.customers.listCustomers('all')
    if (!ready.ok || !all.ok) throw new Error('list failed')
    expect(ready.value.length).toBe(all.value.filter((row) => row.balance >= 3).length)
    expect(ready.value.length).toBeGreaterThan(0)
  })
})
