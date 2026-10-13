import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../common/clock'
import { loyaltyCards, programs, redemptions } from '../database/schema'
import { DrizzleReferralSettlement } from '../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../ledger/ledger.store'
import { neverExpires, NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'
import { claimVisit } from '../test-support/claim-visit'
import { DrizzleCheckInRepository } from './check-in/drizzle-check-in.repository'
import { CheckInService } from './check-in/check-in.service'

const SLOW = 30_000

/** Trocar o programa da loja vale para cartão novo; o que está em andamento termina nas regras em que começou. */
describe.skipIf(!TEST_DATABASE_URL)('program versions against a real database', () => {
  let data: TestDatabase
  let checkIn: CheckInService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  const programOf = async (customerId: string) => (await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId)))[0]?.programId

  it('keeps a card with progress on the old version and gives a new customer the active one', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
    const veteran = await data.createCustomer()
    await claimVisit(data, checkIn, veteran, shop)
    const newProgramId = await data.changeProgram(shop, { mode: 'stamps', target: 3 })

    const newcomer = await data.createCustomer()
    const fresh = await claimVisit(data, checkIn, newcomer, shop)
    expect(fresh).toMatchObject({ ok: true, value: { card: { target: 3 } } })
    expect(await programOf(newcomer)).toBe(newProgramId)
    // O veterano continua na versão antiga do programa.
    expect(await programOf(veteran)).toBe(shop.programId)
  }, SLOW)

  it('moves an emptied card to the active version on the next visit', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
    const customer = await data.createCustomer()
    await data.db.transaction((tx) => ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId }, neverExpires(5)))
    const newProgramId = await data.changeProgram(shop, { mode: 'stamps', target: 3 })
    expect(await claimVisit(data, checkIn, customer, shop)).toMatchObject({ ok: true, value: { card: { target: 3 } } })
    expect(await programOf(customer)).toBe(newProgramId)
  }, SLOW)

  it('starts the card after a delivered reward on the active version', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 }, bonusRules: { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } } })
    const customer = await data.createCustomer()
    const owner = await data.createCustomer({ withProfile: false })
    await claimVisit(data, checkIn, customer, shop)
    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customer))
    if (!card) throw new Error('card expected')
    const [redemption] = await data.db
      .insert(redemptions)
      .values({ cardId: card.id, shopId: shop.id, rewardTitle: 'x', code: 'ABC234', expiresAt: new Date(Date.now() + 600_000) })
      .returning({ id: redemptions.id })
    const newProgramId = await data.changeProgram(shop, { mode: 'stamps', target: 4 }, { bonusRules: { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } } })

    const settled = await data.db.transaction((tx) => ledger.settleRedemption(tx, { redemptionId: redemption?.id ?? '', shopId: shop.id, recordedBy: owner, now: new Date() }))
    expect(settled).toMatchObject({ ok: true, value: { balanceAfter: 2, welcomeUnits: 2 } })
    expect(await programOf(customer)).toBe(newProgramId)
  }, SLOW)

  const aDayAgo = async (customerId: string) =>
    data.db.update(loyaltyCards).set({ lastVisitAt: new Date(Date.now() - 3 * 24 * 3_600_000) }).where(eq(loyaltyCards.customerId, customerId))

  describe('a card on the old version scans a QR issued after the change', () => {
    const stampsToPerReal = async () => {
      const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
      const customer = await data.createCustomer()
      await claimVisit(data, checkIn, customer, shop)
      await aDayAgo(customer)
      await data.changeProgram(shop, { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 })
      return { shop, customer }
    }

    it('stamp card, new per-real program, QR with amount: the stamp card keeps earning stamps', async () => {
      const { shop, customer } = await stampsToPerReal()
      const result = await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'amount', amountCents: 5000 } })
      expect(result).toMatchObject({ ok: true, value: { card: { unit: 'stamp', balance: 2 } } })
      expect(await programOf(customer)).toBe(shop.programId)
    }, SLOW)

    it('stamp card, new per-visit program, QR without amount: the stamp card keeps earning stamps', async () => {
      const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
      const customer = await data.createCustomer()
      await claimVisit(data, checkIn, customer, shop)
      await aDayAgo(customer)
      await data.changeProgram(shop, { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 })
      const result = await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'visit' } })
      expect(result).toMatchObject({ ok: true, value: { card: { unit: 'stamp', balance: 2 } } })
    }, SLOW)

    it('per-real card, new stamps program, QR with amount: the point card keeps earning points', async () => {
      const shop = await data.createShop({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 } })
      const customer = await data.createCustomer()
      await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'amount', amountCents: 3000 } })
      await aDayAgo(customer)
      await data.changeProgram(shop, { mode: 'stamps', target: 5 })
      const result = await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'amount', amountCents: 2000 } })
      expect(result).toMatchObject({ ok: true, value: { card: { unit: 'point', balance: 50 } } })
    }, SLOW)
  })

  it('lets the same customer earn on every QR when the shop has no limit', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, cooldownMode: 'unlimited' })
    const customer = await data.createCustomer()
    expect(await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'amount', amountCents: 1000 } })).toMatchObject({ ok: true, value: { card: { balance: 1 } } })
    expect(await claimVisit(data, checkIn, customer, shop, { earn: { kind: 'amount', amountCents: 1500 } })).toMatchObject({ ok: true, value: { card: { balance: 2 } } })
  }, SLOW)

  it('allows only one active version per shop', async () => {
    const shop = await data.createShop()
    const [current] = await data.db.select().from(programs).where(eq(programs.shopId, shop.id))
    if (!current) throw new Error('program expected')
    const { id: _id, ...copy } = current
    await expect(data.db.insert(programs).values(copy)).rejects.toThrow()
  }, SLOW)
})
