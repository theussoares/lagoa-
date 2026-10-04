import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../common/clock'
import { ledgerEntries, loyaltyCards, programs, referrals } from '../database/schema'
import { DrizzleReferralSettlement } from '../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../ledger/ledger.store'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { CheckInService } from './check-in/check-in.service'
import { DrizzleCheckInRepository } from './check-in/drizzle-check-in.repository'
import { DrizzleReferralRepository } from './referral/drizzle-referral.repository'
import { ReferralService } from './referral/referral.service'

const SLOW = 30_000
const DAY_MS = 86_400_000
const REFERRAL_ON = { ...NO_BONUS_RULES, referralBonus: { enabled: true, units: 2 } }

/** Contra Postgres de verdade: convite pendente, pagamento na 1ª visita, regras e corrida. */
describe.skipIf(!TEST_DATABASE_URL)('referral against a real database', () => {
  let data: TestDatabase
  let checkIn: CheckInService
  let referralService: ReferralService
  let settlement: DrizzleReferralSettlement
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    settlement = new DrizzleReferralSettlement(data.db, ledger)
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), settlement)
    referralService = new ReferralService(new DrizzleReferralRepository(data.db))
  })

  afterAll(async () => data.close())

  const cardOf = async (customerId: string, shopId: string) =>
    (await data.db.select().from(loyaltyCards).where(and(eq(loyaltyCards.customerId, customerId), eq(loyaltyCards.shopId, shopId))))[0]
  const kindsOf = async (customerId: string) =>
    (await data.db.select({ kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta }).from(ledgerEntries).where(eq(ledgerEntries.customerId, customerId)).orderBy(ledgerEntries.occurredAt, ledgerEntries.id)).map((e) => `${e.kind}:${e.units}`)
  const referralsOf = (shopId: string) => data.db.select().from(referrals).where(eq(referrals.shopId, shopId))

  async function invite(shop: { checkInCode: string }, referrer: string, referred: string) {
    return referralService.capture(referred, await data.referralCodeOf(referrer), shop.checkInCode)
  }

  it('pays the referrer when the invited person makes their first visit, creating the referrer card if needed', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    expect(await invite(shop, referrer, referred)).toEqual({ ok: true, value: undefined })
    expect((await referralsOf(shop.id))[0]).toMatchObject({ status: 'pending', referrerId: referrer, referredId: referred })

    expect(await checkIn.checkIn(referred, shop.checkInCode)).toMatchObject({ ok: true })
    const [referral] = await referralsOf(shop.id)
    expect(referral).toMatchObject({ status: 'rewarded' })
    expect(referral?.rewardEntryId).not.toBeNull()
    expect(await kindsOf(referrer)).toEqual(['referralBonus:2'])
    expect(await cardOf(referrer, shop.id)).toMatchObject({ balance: 2, lastVisitAt: null })
  }, SLOW)

  it('adds the bonus to a referrer card that already exists, without holding their next check-in', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await checkIn.checkIn(referrer, shop.checkInCode)
    await invite(shop, referrer, referred)
    await checkIn.checkIn(referred, shop.checkInCode)
    expect((await cardOf(referrer, shop.id))?.balance).toBe(3)
    expect(await checkIn.checkIn(referrer, shop.checkInCode)).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
    expect((await kindsOf(referrer)).filter((k) => k.startsWith('referralBonus'))).toEqual(['referralBonus:2'])
  }, SLOW)

  it('pays only once, even when the settlement runs many times at the same time', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await invite(shop, referrer, referred)
    await data.db.transaction(async (tx) => {
      await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: referred, programId: shop.programId }, { policy: { kind: 'never' }, target: 10, now: new Date() })
    })
    const outcomes = await Promise.all(Array.from({ length: 5 }, () => settlement.settlePending(referred, shop.id, new Date())))
    expect(outcomes.filter((o) => o === 'rewarded')).toHaveLength(1)
    expect(outcomes.filter((o) => o === 'none')).toHaveLength(4)
    expect((await kindsOf(referrer)).filter((k) => k.startsWith('referralBonus'))).toHaveLength(1)
  }, SLOW)

  it('waits for the first visit: nothing is paid while the invited person has no card', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await invite(shop, referrer, referred)
    expect(await settlement.settlePending(referred, shop.id, new Date())).toBe('none')
    expect((await referralsOf(shop.id))[0]?.status).toBe('pending')
  }, SLOW)

  it.each([
    ['a shop whose program does not pay referrals', async () => data.createShop({ bonusRules: NO_BONUS_RULES })],
    ['a pending shop', async () => data.createShop({ bonusRules: REFERRAL_ON, status: 'pending' })],
  ])('keeps no invite for %s', async (_name, makeShop) => {
    const shop = await makeShop()
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    expect(await invite(shop, referrer, referred)).toEqual({ ok: true, value: undefined })
    expect(await referralsOf(shop.id)).toHaveLength(0)
  }, SLOW)

  it('keeps no invite from yourself, from an unknown code, or for someone who is already a customer there', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, customer] = [await data.createCustomer(), await data.createCustomer()]
    await invite(shop, customer, customer)
    expect(await referralService.capture(customer, 'ACDEFGHJ', shop.checkInCode)).toEqual({ ok: true, value: undefined })
    await checkIn.checkIn(customer, shop.checkInCode)
    await invite(shop, referrer, customer)
    expect(await referralsOf(shop.id)).toHaveLength(0)
  }, SLOW)

  it('keeps a single invite per person and shop, whoever sent it first', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [first, second, referred] = [await data.createCustomer(), await data.createCustomer(), await data.createCustomer()]
    await invite(shop, first, referred)
    await invite(shop, second, referred)
    const rows = await referralsOf(shop.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.referrerId).toBe(first)
  }, SLOW)

  it('rejects the referral, paying nothing, when the shop turned the rule off before the first visit', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await invite(shop, referrer, referred)
    await data.db.update(programs).set({ bonusRules: NO_BONUS_RULES }).where(eq(programs.shopId, shop.id))
    await checkIn.checkIn(referred, shop.checkInCode)
    expect((await referralsOf(shop.id))[0]?.status).toBe('rejected')
    expect(await kindsOf(referrer)).toEqual([])
  }, SLOW)

  it('tells a login with no customer profile to register first and stores nothing', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON })
    const referrer = await data.createCustomer()
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await invite(shop, referrer, ghost)).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(await referralsOf(shop.id)).toHaveLength(0)
  }, SLOW)

  it('keeps the bonus on a referrer card that had expired by inactivity (bonus counts as activity)', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON, expiration: { kind: 'afterInactivity', months: 6 } })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await checkIn.checkIn(referrer, shop.checkInCode) // 1
    const long = new Date(Date.now() - 7 * 31 * DAY_MS)
    await data.db.update(loyaltyCards).set({ lastVisitAt: long, lastActivityAt: long }).where(eq(loyaltyCards.customerId, referrer))

    await invite(shop, referrer, referred)
    await checkIn.checkIn(referred, shop.checkInCode)
    expect(await kindsOf(referrer)).toEqual(['checkIn:1', 'expiration:-1', 'referralBonus:2'])
    expect((await cardOf(referrer, shop.id))?.balance).toBe(2)

    // O bônus conta como atividade: o próximo toque no cartão não o apaga nem estoura a chave do vencimento.
    expect(await checkIn.checkIn(referrer, shop.checkInCode)).toMatchObject({ ok: true, value: { card: { balance: 3 } } })
    expect((await kindsOf(referrer)).filter((k) => k.startsWith('expiration'))).toHaveLength(1)
  }, SLOW)

  it('holds the reward when the bonus completes the referrer card', async () => {
    const shop = await data.createShop({ bonusRules: REFERRAL_ON, rules: { mode: 'stamps', target: 3 } })
    const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
    await checkIn.checkIn(referrer, shop.checkInCode)
    await invite(shop, referrer, referred)
    await checkIn.checkIn(referred, shop.checkInCode)
    expect(await cardOf(referrer, shop.id)).toMatchObject({ balance: 3 })
    expect((await cardOf(referrer, shop.id))?.rewardExpiresAt).not.toBeNull()
  }, SLOW)
})
