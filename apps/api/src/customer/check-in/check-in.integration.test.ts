import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { localDateParts } from '#shared/utils/time'
import { SystemClock } from '../../common/clock'
import { ledgerEntries, loyaltyCards } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { neverExpires, NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleWalletRepository } from '../wallet/drizzle-wallet.repository'
import { WalletService } from '../wallet/wallet.service'
import { DrizzleCheckInRepository } from './drizzle-check-in.repository'
import { CheckInService } from './check-in.service'

const SLOW = 30_000
const WELCOME_BONUS = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }

/** Contra Postgres de verdade: é aqui que lock, rollback e ordem do ledger são provados. */
describe.skipIf(!TEST_DATABASE_URL)('check-in against a real database', () => {
  let data: TestDatabase
  let service: CheckInService
  let wallet: WalletService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock())
    wallet = new WalletService(new DrizzleWalletRepository(data.db), { SUPABASE_URL: 'https://project.supabase.co' }, new SystemClock())
  })

  afterAll(async () => data.close())

  const cardsOf = (customerId: string) => data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId))
  const entriesOf = (customerId: string) =>
    data.db.select({ kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta }).from(ledgerEntries).where(eq(ledgerEntries.customerId, customerId)).orderBy(ledgerEntries.id)

  it('creates the card, writes welcome before the visit and shows them as the first stamps', async () => {
    const shop = await data.createShop({ bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    const result = await service.checkIn(customer, shop.checkInCode)
    expect(result).toMatchObject({ ok: true, value: { activity: { units: 1 }, card: { balance: 3, rewardReady: false } } })
    expect(await entriesOf(customer)).toEqual([{ kind: 'welcomeBonus', units: 2 }, { kind: 'checkIn', units: 1 }])
    const cards = await wallet.listCards(customer)
    expect(cards.ok && cards.value[0]?.stamps.map((s) => `${s.number}:${s.source}`)).toEqual(['1:welcomeBonus', '2:welcomeBonus', '3:checkIn'])
  }, SLOW)

  it('holds the second check-in inside the window', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    await service.checkIn(customer, shop.checkInCode)
    const second = await service.checkIn(customer, shop.checkInCode)
    expect(second).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
    expect(await entriesOf(customer)).toHaveLength(1)
  }, SLOW)

  it('lets exactly one of many simultaneous check-ins through, with a single welcome bonus', async () => {
    const shop = await data.createShop({ bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    const results = await Promise.all(Array.from({ length: 8 }, () => service.checkIn(customer, shop.checkInCode)))
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.error.code === 'checkInCooldown')).toBe(true)
    expect(await cardsOf(customer)).toHaveLength(1)
    expect((await entriesOf(customer)).map((e) => e.kind)).toEqual(['welcomeBonus', 'checkIn'])
    expect((await cardsOf(customer))[0]?.balance).toBe(3)
  }, SLOW)

  it('counts a counter visit toward the window (any visit holds the check-in)', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    await service.checkIn(customer, shop.checkInCode)
    const [card] = await cardsOf(customer)
    if (!card) throw new Error('card expected')
    await data.db.transaction(async (tx) => {
      const { card: locked } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId }, neverExpires())
      await ledger.credit(tx, {
        card: locked, shopId: shop.id, customerId: customer, kind: 'visit', now: new Date(),
        idempotencyKey: `test-counter-${customer}`,
        plan: { welcomeUnits: 0, units: 1, appliedBonuses: [], balanceAfter: 2, rewardExpiresAt: null },
      })
    })
    expect(await service.checkIn(customer, shop.checkInCode)).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
  }, SLOW)

  it('doubles the visit on the customer birthday', async () => {
    const shop = await data.createShop({ bonusRules: { ...NO_BONUS_RULES, birthdayMultiplier: { enabled: true, multiplier: 2 } } })
    const customer = await data.createCustomer({ birthday: localDateParts(new Date()).monthDay })
    expect(await service.checkIn(customer, shop.checkInCode)).toMatchObject({ ok: true, value: { activity: { units: 2 } } })
  }, SLOW)

  it('holds the reward when the check-in completes the card', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 }, bonusRules: WELCOME_BONUS })
    const customer = await data.createCustomer()
    expect(await service.checkIn(customer, shop.checkInCode)).toMatchObject({ ok: true, value: { card: { balance: 3, rewardReady: true } } })
    expect((await cardsOf(customer))[0]?.rewardExpiresAt).not.toBeNull()
  }, SLOW)

  it('answers invalidShopQr for a pending shop exactly like for an unknown code, and writes nothing', async () => {
    const pending = await data.createShop({ status: 'pending' })
    const customer = await data.createCustomer()
    expect(await service.checkIn(customer, pending.checkInCode)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(await service.checkIn(customer, 'ZZZZZZ')).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(await cardsOf(customer)).toHaveLength(0)
  }, SLOW)

  it('refuses an amount-only club before opening a transaction, leaving no empty card behind', async () => {
    const shop = await data.createShop({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 2, target: 200 } })
    const customer = await data.createCustomer()
    expect(await service.checkIn(customer, shop.checkInCode)).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
    expect(await cardsOf(customer)).toHaveLength(0)
  }, SLOW)

  it('answers unauthorized for a login without a customer profile and writes nothing', async () => {
    const shop = await data.createShop()
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await service.checkIn(ghost, shop.checkInCode)).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(await cardsOf(ghost)).toHaveLength(0)
  }, SLOW)
})
