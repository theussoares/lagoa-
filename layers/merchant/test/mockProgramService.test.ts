import { describe, expect, it } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { barbershopSession, makeBackend, staticSession } from '#layers/core/test/fixtures'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'
import { toProgramDraft } from '../app/utils/programForm'

function setup() {
  const { backend } = makeBackend()
  return createMockMerchantServices(backend, staticSession(barbershopSession))
}

describe('mock ProgramService', () => {
  it('counts the shop cards that lock the program mode', async () => {
    const services = setup()
    const result = await services.program.countActiveCards()
    expect(result.ok && result.value).toBeGreaterThan(0)
  })

  it('refuses to switch stamps to points while customers hold cards', async () => {
    const services = setup()
    const current = await services.program.getProgram()
    if (!current.ok) throw new Error(current.error.code)
    const draft = { ...toProgramDraft(current.value), rules: { mode: 'pointsPerVisit' as const, pointsPerVisit: 10, target: 100 } }
    const result = await services.program.updateProgram(draft)
    expect(result).toEqual({ ok: false, error: { code: 'programModeLocked' } })
  })

  it('applies a new target to cards in progress', async () => {
    const services = setup()
    const current = await services.program.getProgram()
    if (!current.ok) throw new Error(current.error.code)
    const draft = { ...toProgramDraft(current.value), rules: { mode: 'stamps' as const, target: 12 }, reward: { title: 'Corte e barba' } }
    const saved = await services.program.updateProgram(draft)
    expect(saved.ok && saved.value.rules.target).toBe(12)

    const visit = await services.counter.registerVisit(PhoneNumberSchema.parse('67900000001'))
    if (!visit.ok) throw new Error(visit.error.code)
    expect(visit.value.card.target).toBe(12)
  })
})
