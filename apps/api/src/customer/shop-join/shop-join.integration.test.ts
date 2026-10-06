import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { ledgerEntries, loyaltyCards, referrals } from '../../database/schema'
import { LedgerStore } from '../../ledger/ledger.store'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleReferralRepository } from '../referral/drizzle-referral.repository'
import { ReferralService } from '../referral/referral.service'
import { DrizzleShopJoinRepository } from './drizzle-shop-join.repository'
import { ShopJoinService } from './shop-join.service'

const SLOW = 30_000
const REFERRAL_ON = { ...NO_BONUS_RULES, referralBonus: { enabled: true, units: 2 } }
const WELCOME_ON = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }

/** Contra Postgres de verdade: entrar no clube cria só o cartão, nunca ledger nem visita. */
describe.skipIf(!TEST_DATABASE_URL)('shop-join against a real database', () => {
  let data: TestDatabase
  let service: ShopJoinService

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new ShopJoinService(new DrizzleShopJoinRepository(data.db, new LedgerStore()), new SystemClock())
  })

  afterAll(async () => data.close())

  const cardsOf = (customerId: string) => data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId))
  const entriesOf = (customerId: string) => data.db.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, customerId))

  it('CA-01: creates one zeroed card with no visit and no ledger line, even with the welcome bonus on', async () => {
    const shop = await data.createShop({ bonusRules: WELCOME_ON })
    const customer = await data.createCustomer()
    const result = await service.joinShop(customer, shop.checkInCode)
    expect(result).toMatchObject({ ok: true, value: { shopId: shop.id, alreadyMember: false } })
    const cards = await cardsOf(customer)
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ balance: 0, lastVisitAt: null, programId: shop.programId })
    expect(await entriesOf(customer)).toHaveLength(0)
  }, SLOW)

  it('CA-02: three sends leave one card, no ledger and alreadyMember on every answer', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    const results = [await service.joinShop(customer, shop.checkInCode), await service.joinShop(customer, shop.checkInCode), await service.joinShop(customer, shop.checkInCode)]
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.map((r) => r.ok && r.value.alreadyMember)).toEqual([false, true, true])
    expect(await cardsOf(customer)).toHaveLength(1)
    expect(await entriesOf(customer)).toHaveLength(0)
  }, SLOW)

  it('CA-02: simultaneous sends still leave one card and one first answer', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer()
    const results = await Promise.all(Array.from({ length: 6 }, () => service.joinShop(customer, shop.checkInCode)))
    expect(results.every((r) => r.ok)).toBe(true)
    expect(results.filter((r) => r.ok && !r.value.alreadyMember)).toHaveLength(1)
    expect(new Set(results.map((r) => r.ok && r.value.cardId)).size).toBe(1)
    expect(await cardsOf(customer)).toHaveLength(1)
  }, SLOW)

  it('RN-02: a shop that turned joining off refuses a non-member and creates no card', async () => {
    const shop = await data.createShop({ checkInEnabled: false })
    const customer = await data.createCustomer()
    expect(await service.joinShop(customer, shop.checkInCode)).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
    expect(await cardsOf(customer)).toHaveLength(0)
  }, SLOW)

  it.each(['pending', 'suspended'] as const)('CA-03: a %s shop answers invalidShopQr and creates no card', async (status) => {
    const shop = await data.createShop({ status })
    const customer = await data.createCustomer()
    expect(await service.joinShop(customer, shop.checkInCode)).toEqual({ ok: false, error: { code: 'invalidShopQr' } })
    expect(await cardsOf(customer)).toHaveLength(0)
  }, SLOW)

  it('answers unauthorized and creates no card when the customer has no profile', async () => {
    const shop = await data.createShop()
    const customer = await data.createCustomer({ withProfile: false })
    expect(await service.joinShop(customer, shop.checkInCode)).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(await cardsOf(customer)).toHaveLength(0)
  }, SLOW)

  it('CA-04: joining does not pay a pending invitation', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    const referralService = new ReferralService(new DrizzleReferralRepository(data.db))
    expect(await referralService.capture(referred, await data.referralCodeOf(referrer), shop.checkInCode)).toEqual({ ok: true, value: undefined })

    expect(await service.joinShop(referred, shop.checkInCode)).toMatchObject({ ok: true })
    const [referral] = await data.db.select().from(referrals).where(eq(referrals.shopId, shop.id))
    expect(referral).toMatchObject({ status: 'pending', rewardEntryId: null })
    expect(await entriesOf(referrer)).toHaveLength(0)
    expect(await cardsOf(referrer)).toHaveLength(0)
  }, SLOW)
})
