import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../common/clock'
import { ledgerEntries, loyaltyCards } from '../database/schema'
import { LedgerStore } from '../ledger/ledger.store'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { CheckInService } from './check-in/check-in.service'
import { DrizzleCheckInRepository } from './check-in/drizzle-check-in.repository'
import { DrizzleRedemptionRepository } from './redemption/drizzle-redemption.repository'
import { RedemptionService } from './redemption/redemption.service'
import { DrizzleWalletRepository } from './wallet/drizzle-wallet.repository'
import { WalletService } from './wallet/wallet.service'

const SLOW = 30_000
const WELCOME_BONUS = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }
const DAY_MS = 86_400_000
const MONTHS_AGO = (months: number): Date => new Date(Date.now() - months * 31 * DAY_MS)

/** O vencimento tem que valer em todos os caminhos e ser gravado uma vez só, mesmo com pedidos simultâneos. */
describe.skipIf(!TEST_DATABASE_URL)('expiration against a real database', () => {
  let data: TestDatabase
  let checkIn: CheckInService
  let redemption: RedemptionService
  let wallet: WalletService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    const clock = new SystemClock()
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), clock)
    redemption = new RedemptionService(new DrizzleRedemptionRepository(data.db, ledger), clock)
    wallet = new WalletService(new DrizzleWalletRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, clock)
  })

  afterAll(async () => data.close())

  const cardOf = async (customerId: string) => (await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId)))[0]
  const kindsOf = async (customerId: string) =>
    (await data.db.select({ kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta }).from(ledgerEntries).where(eq(ledgerEntries.customerId, customerId)).orderBy(ledgerEntries.occurredAt, ledgerEntries.id)).map((e) => `${e.kind}:${e.units}`)

  async function idleCard() {
    const shop = await data.createShop({ bonusRules: WELCOME_BONUS, expiration: { kind: 'afterInactivity', months: 6 }, rules: { mode: 'stamps', target: 10 } })
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, shop.checkInCode) // 2 de boas-vindas + 1 = 3
    await data.db.update(loyaltyCards).set({ lastVisitAt: MONTHS_AGO(7) }).where(eq(loyaltyCards.customerId, customer))
    return { shop, customer }
  }

  it('shows an idle card as empty on read without writing anything', async () => {
    const { customer } = await idleCard()
    const cards = await wallet.listCards(customer)
    expect(cards).toMatchObject({ ok: true, value: [{ balance: 0, stamps: [] }] })
    expect((await cardOf(customer))?.balance).toBe(3)
    expect(await kindsOf(customer)).toEqual(['welcomeBonus:2', 'checkIn:1'])
  }, SLOW)

  it('writes the expiration once, before crediting the new visit, even with simultaneous check-ins', async () => {
    const { shop, customer } = await idleCard()
    const results = await Promise.all(Array.from({ length: 5 }, () => checkIn.checkIn(customer, shop.checkInCode)))
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.find((r) => r.ok)).toMatchObject({ ok: true, value: { card: { balance: 1 } } })
    const kinds = await kindsOf(customer)
    expect(kinds.filter((k) => k.startsWith('expiration'))).toEqual(['expiration:-3'])
    expect((await cardOf(customer))?.balance).toBe(1)
  }, SLOW)

  it('does not welcome an expired card again: it is the same card, just empty', async () => {
    const { shop, customer } = await idleCard()
    await checkIn.checkIn(customer, shop.checkInCode)
    expect((await kindsOf(customer)).filter((k) => k.startsWith('welcomeBonus'))).toHaveLength(1)
  }, SLOW)

  it('retires a lapsed reward when the customer asks for the code, instead of handing it out', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 }, bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, shop.checkInCode) // 3 de 3: pronto, guardado por 30 dias
    const card = await cardOf(customer)
    expect(card?.rewardExpiresAt).not.toBeNull()
    await data.db.update(loyaltyCards).set({ rewardExpiresAt: new Date(Date.now() - DAY_MS) }).where(eq(loyaltyCards.customerId, customer))

    expect(await redemption.requestCode(customer, card?.id ?? '')).toEqual({ ok: false, error: { code: 'rewardNotReady', remaining: 3 } })
    expect(await redemption.requestCode(customer, card?.id ?? '')).toEqual({ ok: false, error: { code: 'rewardNotReady', remaining: 3 } })
    expect((await kindsOf(customer)).filter((k) => k.startsWith('expiration'))).toEqual(['expiration:-3'])
    expect((await cardOf(customer))).toMatchObject({ balance: 0, rewardExpiresAt: null })
  }, SLOW)

  it('refuses to deliver a prize that lapsed while its code was on the screen', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 }, bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    await checkIn.checkIn(customer, shop.checkInCode)
    const card = await cardOf(customer)
    const created = await redemption.requestCode(customer, card?.id ?? '')
    if (!created.ok) throw new Error('expected a code')
    await data.db.update(loyaltyCards).set({ rewardExpiresAt: new Date(Date.now() - 1000) }).where(eq(loyaltyCards.customerId, customer))
    const owner = await data.createCustomer({ withProfile: false })
    const result = await data.db.transaction((tx) => ledger.settleRedemption(tx, { redemptionId: created.value.id, shopId: shop.id, recordedBy: owner, now: new Date() }))
    expect(result).toEqual({ ok: false, error: { code: 'rewardNotReady', remaining: 3 } })
    expect((await kindsOf(customer)).filter((k) => k.startsWith('redemption'))).toHaveLength(0)
  }, SLOW)

  it('starts a new hold when more than one full reward is left after a lapse', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 } })
    const customer = await data.createCustomer()
    await data.db.transaction(async (tx) => {
      const { card } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId }, { policy: { kind: 'never' }, target: 3, now: new Date() })
      await ledger.credit(tx, { card, shopId: shop.id, customerId: customer, kind: 'visit', now: new Date(), idempotencyKey: `fill-${customer}`, plan: { welcomeUnits: 0, units: 7, appliedBonuses: [], balanceAfter: 7, rewardExpiresAt: new Date(Date.now() - DAY_MS) } })
    })
    await data.db.update(loyaltyCards).set({ lastVisitAt: MONTHS_AGO(0) }).where(eq(loyaltyCards.customerId, customer))
    const card = await cardOf(customer)
    expect(await redemption.requestCode(customer, card?.id ?? '')).toMatchObject({ ok: true })
    expect(await cardOf(customer)).toMatchObject({ balance: 4 })
    expect((await cardOf(customer))?.rewardExpiresAt).not.toBeNull()
  }, SLOW)
})
