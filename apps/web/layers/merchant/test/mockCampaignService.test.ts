import { describe, expect, it } from 'vitest'
import { LAPSED_AFTER_DAYS, REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { addDays, toIso } from '#shared/utils/time'
import { EXAMPLE_IDS } from '#layers/core/app/mock'
import { anaSession, barbershopSession, cafeSession, makeBackend, staticSession, TEST_NOW } from '#layers/core/test/fixtures'
import { customerView } from './customerView'
import type { MerchantServices } from '../app/services/MerchantServices'
import { createMockMerchantServices } from '../app/services/mock/createMockMerchantServices'

const HOURS_PER_DAY = 24
const { shops, customers, phones } = EXAMPLE_IDS

function setup() {
  const { backend, clock } = makeBackend()
  const barbershop = createMockMerchantServices(backend, staticSession(barbershopSession))
  const cafe = createMockMerchantServices(backend, staticSession(cafeSession))
  const joao = customerView(backend, staticSession({ ...anaSession, customerId: customers.joao }))
  const ana = customerView(backend, staticSession(anaSession))
  // O seed nasce na primeira chamada: carregue o backend antes de avançar o relógio.
  const advanceDays = (days: number): void => clock.advanceHours(days * HOURS_PER_DAY)
  return { barbershop, cafe, joao, ana, advanceDays }
}

type CustomerServices = ReturnType<typeof setup>['joao']

async function overviewOf(merchant: MerchantServices) {
  const result = await merchant.campaigns.getOverview()
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

async function cardOf(customer: CustomerServices, shopId: (typeof shops)[keyof typeof shops]) {
  const card = await customer.wallet.getCard(shopId)
  if (!card.ok) throw new Error(card.error.code)
  return card.value
}

const draft = { message: 'Sentimos sua falta!', bonusUnits: 1 }

describe('mock CampaignService', () => {
  it('counts lapsed customers by consent, without exposing who they are', async () => {
    const { barbershop } = setup()
    const overview = await overviewOf(barbershop)
    expect(overview).toEqual({
      unit: 'stamp',
      bonusLimits: { min: 0, max: 9, suggested: 1 },
      reach: { lapsed: 2, withoutConsent: 1, expired: 0, alreadyReminded: 0, reachable: 1 },
      history: [],
    })
    expect(JSON.stringify(overview)).not.toMatch(/6790000|cus_/)
  })

  it('gives the bonus with a wallet entry, without counting it as a visit or showing it at the counter', async () => {
    const { barbershop, joao } = setup()
    const before = (await cardOf(joao, shops.barbershop)).balance
    const sent = await barbershop.campaigns.sendReminder(draft, 1)
    expect(sent.ok && sent.value).toMatchObject({ kind: 'lapsedReminder', recipientsCount: 1, bonusUnits: 1, unit: 'stamp' })
    expect((await cardOf(joao, shops.barbershop)).balance).toBe(before + 1)

    const activity = await joao.wallet.listActivity(1)
    expect(activity.ok && activity.value[0]).toMatchObject({ kind: 'campaignBonus', units: 1, shopId: shops.barbershop })

    const lapsed = await barbershop.customers.listCustomers('lapsed')
    expect(lapsed.ok && lapsed.value.map((row) => row.firstName)).toEqual(['João', 'Lucas'])
    const counter = await barbershop.counter.listTodayEntries()
    expect(counter.ok && counter.value.some((entry) => entry.kind === 'campaignBonus')).toBe(false)
  })

  it('sends nothing when the reach changed since the merchant confirmed', async () => {
    const { barbershop } = setup()
    expect(await barbershop.campaigns.sendReminder(draft, 3)).toEqual({ ok: false, error: { code: 'reachChanged' } })
    expect((await overviewOf(barbershop)).history).toEqual([])
  })

  it('reminds once per lapse: again only after the customer comes back and lapses again', async () => {
    const { barbershop, advanceDays } = setup()
    await barbershop.campaigns.sendReminder(draft, 1)
    expect(await barbershop.campaigns.sendReminder(draft, 1)).toEqual({ ok: false, error: { code: 'noReachableCustomers' } })

    advanceDays(LAPSED_AFTER_DAYS * 2)
    const later = await overviewOf(barbershop)
    expect(later.reach).toMatchObject({ alreadyReminded: 1 })
    expect(later.history).toHaveLength(1)

    await barbershop.counter.registerVisit(phones.joao)
    advanceDays(LAPSED_AFTER_DAYS + 1)
    const sent = await barbershop.campaigns.sendReminder(draft, (await overviewOf(barbershop)).reach.reachable)
    expect(sent.ok && sent.value.recipientsCount).toBeGreaterThanOrEqual(1)
  })

  it('skips cards already wiped by inactivity, where the gift would be wiped again', async () => {
    const { barbershop, advanceDays } = setup()
    await overviewOf(barbershop)
    advanceDays(200)
    expect((await overviewOf(barbershop)).reach).toMatchObject({ expired: 2, reachable: 0 })
  })

  it('sends a message without bonus when the merchant sets it to zero', async () => {
    const { barbershop, joao } = setup()
    const before = (await cardOf(joao, shops.barbershop)).balance
    expect((await barbershop.campaigns.sendReminder({ ...draft, bonusUnits: 0 }, 1)).ok).toBe(true)
    expect((await cardOf(joao, shops.barbershop)).balance).toBe(before)
    const activity = await joao.wallet.listActivity(1)
    expect(activity.ok && activity.value[0]?.kind).not.toBe('campaignBonus')
  })

  it('rejects a blank message or a gift that alone reaches the target', async () => {
    const { barbershop } = setup()
    const invalid = { ok: false, error: { code: 'invalidCampaign' } }
    expect(await barbershop.campaigns.sendReminder({ ...draft, message: '   ' }, 1)).toEqual(invalid)
    expect(await barbershop.campaigns.sendReminder({ ...draft, bonusUnits: 10 }, 1)).toEqual(invalid)
    expect((await overviewOf(barbershop)).history).toEqual([])
  })

  it('holds a reward the gift unlocks for the usual period', async () => {
    const { barbershop, joao } = setup()
    const card = await cardOf(joao, shops.barbershop)
    await barbershop.campaigns.sendReminder({ ...draft, bonusUnits: card.target - card.balance }, 1)
    expect((await cardOf(joao, shops.barbershop)).rewardExpiresAt).toBe(toIso(addDays(TEST_NOW, REWARD_HOLD_DAYS)))
  })

  it('sizes the gift in points on a points program', async () => {
    const { cafe, ana, advanceDays } = setup()
    await overviewOf(cafe)
    advanceDays(LAPSED_AFTER_DAYS + 5)
    const overview = await overviewOf(cafe)
    expect(overview).toMatchObject({ unit: 'point', bonusLimits: { min: 0, max: 149, suggested: 20 }, reach: { reachable: 1 } })

    const before = await cardOf(ana, shops.cafe)
    expect((await cafe.campaigns.sendReminder({ ...draft, bonusUnits: 20 }, 1)).ok).toBe(true)
    const after = await cardOf(ana, shops.cafe)
    expect(after.balance).toBe(before.balance + 20)
    expect(after.stamps).toEqual([])
  })

  it('stops reaching a customer who revokes consent', async () => {
    const { barbershop, joao } = setup()
    expect((await joao.profile.setNotificationConsent(false)).ok).toBe(true)
    expect(await barbershop.campaigns.sendReminder(draft, 1)).toEqual({ ok: false, error: { code: 'noReachableCustomers' } })
  })
})
