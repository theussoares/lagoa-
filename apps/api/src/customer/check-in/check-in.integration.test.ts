import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { BonusRules } from '#shared/schemas/program'
import { VisitCodeSchema } from '#shared/schemas/visitQr'
import { Clock } from '../../common/clock'
import { generateVisitToken, hashVisitToken } from '../../common/visit-token'
import { ledgerEntries, loyaltyCards, referrals, shops, visitQrs } from '../../database/schema'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../../ledger/ledger.store'
import { neverExpires, NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase, type TestShop } from '../../test-support/test-database'
import { DrizzleReferralRepository } from '../referral/drizzle-referral.repository'
import { ReferralService } from '../referral/referral.service'
import { DrizzleCheckInRepository } from './drizzle-check-in.repository'
import { CheckInService } from './check-in.service'

const SLOW = 30_000
const VERY_SLOW = 120_000
const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const WELCOME_BONUS = { ...NO_BONUS_RULES, welcomeBonus: { enabled: true, units: 2 } }
const T0 = new Date('2026-10-03T15:00:00Z')

class TestClock extends Clock {
  constructor(public current: Date) {
    super()
  }
  now(): Date {
    return this.current
  }
}

/** Contra Postgres de verdade: é aqui que lock, uso único, rollback e ordem do ledger são provados. */
describe.skipIf(!TEST_DATABASE_URL)('claiming a visit QR against a real database', () => {
  let data: TestDatabase
  let service: CheckInService
  let repository: DrizzleCheckInRepository
  let referralService: ReferralService
  const clock = new TestClock(T0)
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    repository = new DrizzleCheckInRepository(data.db, ledger)
    service = new CheckInService(repository, clock, new DrizzleReferralSettlement(data.db, ledger))
    referralService = new ReferralService(new DrizzleReferralRepository(data.db))
  })

  afterAll(async () => data.close())

  const at = (offsetMs: number): Date => new Date(T0.getTime() + offsetMs)
  const cardsOf = (customerId: string) => data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, customerId))
  const entriesOf = (customerId: string) =>
    data.db
      .select({ id: ledgerEntries.id, kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta, amountCents: ledgerEntries.amountCents, recordedBy: ledgerEntries.recordedBy })
      .from(ledgerEntries)
      .where(eq(ledgerEntries.customerId, customerId))
      .orderBy(ledgerEntries.occurredAt, ledgerEntries.id)
  const qrRow = async (id: string) => {
    const [row] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, id))
    if (!row) throw new Error('visit QR expected')
    return row
  }
  const ownerOf = async (shopId: string) => {
    const [row] = await data.db.select({ owner: shops.ownerUserId }).from(shops).where(eq(shops.id, shopId))
    if (!row) throw new Error('shop expected')
    return row.owner
  }
  const claim = (customerId: string, token: string) => service.claimVisitQr(customerId, { token })

  /** Cartão já em andamento: uma visita antiga que deixou `balance` unidades. */
  async function seedCard(shop: TestShop, customerId: string, balance: number, lastVisitAt: Date): Promise<void> {
    await data.db.transaction(async (tx) => {
      const { card } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId, programId: shop.programId }, neverExpires())
      await ledger.credit(tx, {
        card,
        shopId: shop.id,
        customerId,
        kind: 'visit',
        now: lastVisitAt,
        idempotencyKey: `seed-${customerId}`,
        plan: { welcomeUnits: 0, units: balance, appliedBonuses: [], balanceAfter: balance, rewardExpiresAt: null },
      })
    })
  }

  describe('using a QR', () => {
    it('credits the visit inside the validity (CA-10) as the issuer, and marks the QR as used by this customer', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      await seedCard(shop, customer, 3, at(-2 * DAY_MS))
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = at(4 * MINUTE_MS + 59_000)

      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { activity: { kind: 'visit', units: 1 }, card: { balance: 4, target: 10 } } })

      const entries = await entriesOf(customer)
      expect(entries.at(-1)).toMatchObject({ kind: 'visit', units: 1, amountCents: null, recordedBy: await ownerOf(shop.id) })
      expect(entries).toHaveLength(2)
      expect(await qrRow(qr.id)).toMatchObject({ status: 'claimed', claimedBy: customer, ledgerEntryId: entries.at(-1)?.id })
      expect((await cardsOf(customer))[0]?.balance).toBe(4)
    }, SLOW)

    it('records as the issuer the person who attested the sale, whoever that is', async () => {
      const shop = await data.createShop()
      const staff = await data.createCustomer({ withProfile: false })
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, issuedBy: staff, createdAt: T0 })
      clock.current = T0
      expect((await claim(customer, qr.token)).ok).toBe(true)
      expect((await entriesOf(customer))[0]?.recordedBy).toBe(staff)
    }, SLOW)

    it('refuses it from the expiry instant on (CA-11) and writes nothing, not even the card', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = at(5 * MINUTE_MS)
      expect(await claim(customer, qr.token)).toEqual({ ok: false, error: { code: 'visitQrExpired' } })
      expect(await cardsOf(customer)).toHaveLength(0)
      expect(await entriesOf(customer)).toHaveLength(0)
      expect((await qrRow(qr.id)).status).toBe('active')
    }, SLOW)

    it('earns what the QR carries, and records the amount in the ledger (CA-12)', async () => {
      const shop = await data.createShop({ rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 200 } })
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0, earn: { kind: 'amount', amountCents: 4590 } })
      clock.current = T0
      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { activity: { kind: 'amount', units: 45 }, card: { balance: 45, unit: 'point' } } })
      expect(await entriesOf(customer)).toMatchObject([{ kind: 'amount', units: 45, amountCents: 4590 }])
    }, SLOW)

    it('creates the card and writes the welcome units before the visit, paying the referral (CA-19)', async () => {
      const shop = await data.createShop({ bonusRules: { ...WELCOME_BONUS, referralBonus: { enabled: true, units: 2 } } })
      const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
      expect(await referralService.capture(referred, await data.referralCodeOf(referrer), shop.checkInCode)).toEqual({ ok: true, value: undefined })
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0

      expect(await claim(referred, qr.token)).toMatchObject({ ok: true, value: { card: { balance: 3 } } })
      expect((await entriesOf(referred)).map((e) => `${e.kind}:${e.units}`)).toEqual(['welcomeBonus:2', 'visit:1'])
      expect((await data.db.select().from(referrals).where(eq(referrals.referredId, referred)))[0]?.status).toBe('rewarded')
      expect((await cardsOf(referrer))[0]?.balance).toBe(2)
    }, SLOW)

    it('gives 2, not 4, on a birthday that is also a surprise day (CA-20)', async () => {
      const bonusRules: BonusRules = {
        ...NO_BONUS_RULES,
        birthdayMultiplier: { enabled: true, multiplier: 2 },
        surpriseDay: { enabled: true, multiplier: 2, date: '2026-10-03' },
      }
      const shop = await data.createShop({ bonusRules })
      const customer = await data.createCustomer({ birthday: '10-03' })
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { activity: { units: 2 } } })
    }, SLOW)

    it('applies the expiration before crediting: the idle balance expires, then the visit lands on an empty card', async () => {
      const shop = await data.createShop({ expiration: { kind: 'afterInactivity', months: 6 } })
      const customer = await data.createCustomer()
      await seedCard(shop, customer, 3, at(-7 * 31 * DAY_MS))
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { card: { balance: 1 } } })
      expect((await entriesOf(customer)).map((e) => `${e.kind}:${e.units}`)).toEqual(['visit:3', 'expiration:-3', 'visit:1'])
    }, SLOW)

    it('answers unauthorized for a login without a customer profile, and leaves the QR usable', async () => {
      const shop = await data.createShop()
      const ghost = await data.createCustomer({ withProfile: false })
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      expect(await claim(ghost, qr.token)).toEqual({ ok: false, error: { code: 'unauthorized' } })
      expect(await cardsOf(ghost)).toHaveLength(0)
      expect((await qrRow(qr.id)).status).toBe('active')
    }, SLOW)
  })

  describe('one use only', () => {
    it('lets exactly one of two simultaneous customers through, 20 rounds in a row (CA-13)', async () => {
      const shop = await data.createShop()
      for (let round = 0; round < 20; round += 1) {
        const [a, b] = [await data.createCustomer(), await data.createCustomer()]
        clock.current = new Date()
        const qr = await data.createVisitQr({ shopId: shop.id, createdAt: clock.current })
        const results = await Promise.all([claim(a, qr.token), claim(b, qr.token)])

        expect(results.filter((r) => r.ok)).toHaveLength(1)
        expect(results.filter((r) => !r.ok && r.error.code === 'visitQrAlreadyUsed')).toHaveLength(1)
        expect(await data.db.select().from(ledgerEntries).where(eq(ledgerEntries.idempotencyKey, `visit-qr:${qr.id}`))).toHaveLength(1)
        const winner = (await qrRow(qr.id)).claimedBy
        expect([a, b]).toContain(winner)
        const loser = winner === a ? b : a
        expect(await cardsOf(loser)).toHaveLength(0)
      }
    }, VERY_SLOW)

    it('gives the same answer to the same customer sending it again, many at once, and writes once', async () => {
      const shop = await data.createShop({ bonusRules: WELCOME_BONUS })
      const customer = await data.createCustomer()
      clock.current = new Date()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: clock.current })
      const results = await Promise.all(Array.from({ length: 6 }, () => claim(customer, qr.token)))
      expect(results.every((r) => r.ok)).toBe(true)
      expect(new Set(results.map((r) => (r.ok ? r.value.activity.id : ''))).size).toBe(1)
      expect((await entriesOf(customer)).map((e) => e.kind)).toEqual(['welcomeBonus', 'visit'])
    }, SLOW)

    it('answers a resend with the recorded visit, even after the QR would have expired, without touching the ledger (CA-14)', async () => {
      const shop = await data.createShop({ bonusRules: WELCOME_BONUS })
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      const first = await claim(customer, qr.token)
      const before = await entriesOf(customer)

      clock.current = at(30 * MINUTE_MS)
      expect(await claim(customer, qr.token)).toEqual(first)
      expect(await service.claimVisitQr(customer, { visitCode: qr.visitCode })).toEqual(first)
      expect(await entriesOf(customer)).toEqual(before)
    }, SLOW)

    it('answers a resend with the balance and the instant of that visit, even after the card moved on', async () => {
      const shop = await data.createShop({ bonusRules: WELCOME_BONUS })
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      const first = await claim(customer, qr.token)
      await data.db.transaction(async (tx) => {
        const { card } = await ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId }, neverExpires())
        await ledger.credit(tx, {
          card,
          shopId: shop.id,
          customerId: customer,
          kind: 'visit',
          now: at(2 * DAY_MS),
          idempotencyKey: `later-${customer}`,
          plan: { welcomeUnits: 0, units: 1, appliedBonuses: [], balanceAfter: card.balance + 1, rewardExpiresAt: null },
        })
      })

      clock.current = at(3 * DAY_MS)
      expect(await claim(customer, qr.token)).toEqual(first)
      expect((await cardsOf(customer))[0]?.balance).toBe(4)
    }, SLOW)

    it('does not pay the referral again on a resend', async () => {
      const shop = await data.createShop({ bonusRules: { ...NO_BONUS_RULES, referralBonus: { enabled: true, units: 2 } } })
      const [referrer, referred] = [await data.createCustomer(), await data.createCustomer()]
      await referralService.capture(referred, await data.referralCodeOf(referrer), shop.checkInCode)
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      await claim(referred, qr.token)
      await claim(referred, qr.token)
      expect((await entriesOf(referrer)).map((e) => e.kind)).toEqual(['referralBonus'])
    }, SLOW)

    it('answers visitQrAlreadyUsed to another customer, who gets no card', async () => {
      const shop = await data.createShop()
      const [a, b] = [await data.createCustomer(), await data.createCustomer()]
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      await claim(a, qr.token)
      expect(await claim(b, qr.token)).toEqual({ ok: false, error: { code: 'visitQrAlreadyUsed' } })
      expect(await cardsOf(b)).toHaveLength(0)
    }, SLOW)
  })

  describe('refusals that must not consume the QR', () => {
    it('holds a visit inside the window, says when it opens, keeps the QR active and notes the refusal (CA-15)', async () => {
      const shop = await data.createShop({ cooldownHours: 4 })
      const customer = await data.createCustomer()
      await seedCard(shop, customer, 2, at(-HOUR_MS))
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = at(MINUTE_MS)

      expect(await claim(customer, qr.token)).toEqual({ ok: false, error: { code: 'checkInCooldown', availableAt: at(3 * HOUR_MS).toISOString() } })
      expect(await qrRow(qr.id)).toMatchObject({ status: 'active', refusedAt: clock.current, refusalAvailableAt: at(3 * HOUR_MS), claimedBy: null, ledgerEntryId: null })
      expect((await cardsOf(customer))[0]?.balance).toBe(2)
      expect(await entriesOf(customer)).toHaveLength(1)
    }, SLOW)

    it('lets the same QR be used by someone else after the refusal', async () => {
      const shop = await data.createShop({ cooldownHours: 4 })
      const [held, other] = [await data.createCustomer(), await data.createCustomer()]
      await seedCard(shop, held, 2, at(-HOUR_MS))
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = at(MINUTE_MS)
      expect(await claim(held, qr.token)).toMatchObject({ ok: false })
      expect(await claim(other, qr.token)).toMatchObject({ ok: true })
    }, SLOW)

    it('counts a visit from any source toward the window', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      const [first, second] = [await data.createVisitQr({ shopId: shop.id, createdAt: T0 }), await data.createVisitQr({ shopId: shop.id, createdAt: T0 })]
      clock.current = T0
      expect((await claim(customer, first.token)).ok).toBe(true)
      expect(await claim(customer, second.token)).toMatchObject({ ok: false, error: { code: 'checkInCooldown' } })
    }, SLOW)
  })

  describe('QRs that stop working', () => {
    it('answers visitQrStale after the program changed, writing nothing (CA-16)', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      await data.changeProgram(shop, { mode: 'stamps', target: 3 })
      clock.current = T0
      expect(await claim(customer, qr.token)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
      expect(await cardsOf(customer)).toHaveLength(0)
      expect((await qrRow(qr.id)).status).toBe('active')
    }, SLOW)

    it('answers visitQrStale for a QR the program change cancelled, and invalidVisitQr when the merchant cancelled it (CA-18)', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      const [byProgram, byMerchant] = [
        await data.createVisitQr({ shopId: shop.id, createdAt: T0, status: 'cancelled', cancelReason: 'programChanged' }),
        await data.createVisitQr({ shopId: shop.id, createdAt: T0, status: 'cancelled', cancelReason: 'merchant' }),
      ]
      clock.current = T0
      expect(await claim(customer, byProgram.token)).toEqual({ ok: false, error: { code: 'visitQrStale' } })
      expect(await claim(customer, byMerchant.token)).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
      expect(await cardsOf(customer)).toHaveLength(0)
    }, SLOW)

    it('answers invalidVisitQr exactly like for an unknown credential when the shop is suspended or pending (CA-17)', async () => {
      const shop = await data.createShop()
      const pending = await data.createShop({ status: 'pending' })
      const customer = await data.createCustomer()
      const [suspendedQr, pendingQr] = [await data.createVisitQr({ shopId: shop.id, createdAt: T0 }), await data.createVisitQr({ shopId: pending.id, createdAt: T0 })]
      await data.db.update(shops).set({ status: 'suspended' }).where(eq(shops.id, shop.id))
      clock.current = T0
      const unknown = await service.claimVisitQr(customer, { visitCode: 'ZZZZZ' })
      expect(await claim(customer, suspendedQr.token)).toEqual(unknown)
      expect(await claim(customer, pendingQr.token)).toEqual(unknown)
      expect(unknown).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
      expect(await service.claimVisitQr(customer, { visitCode: suspendedQr.visitCode })).toEqual(unknown)
      expect(await cardsOf(customer)).toHaveLength(0)
    }, SLOW)

    it('answers invalidVisitQr for a token nobody issued', async () => {
      const customer = await data.createCustomer()
      expect(await claim(customer, 'A'.repeat(43))).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    }, SLOW)
  })

  describe('program versions', () => {
    it('earns by the rules of the version the card is on, and keeps the card there', async () => {
      const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
      const customer = await data.createCustomer()
      await seedCard(shop, customer, 2, at(-2 * DAY_MS))
      const newProgramId = await data.changeProgram(shop, { mode: 'stamps', target: 3 })
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      expect(newProgramId).not.toBe(shop.programId)
      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { card: { balance: 3, target: 5 } } })
      expect((await cardsOf(customer))[0]?.programId).toBe(shop.programId)
    }, SLOW)

    it('moves an emptied card to the active version', async () => {
      const shop = await data.createShop({ rules: { mode: 'stamps', target: 5 } })
      const customer = await data.createCustomer()
      await data.db.transaction((tx) => ledger.lockOrCreateCard(tx, { shopId: shop.id, customerId: customer, programId: shop.programId }, neverExpires(5)))
      const newProgramId = await data.changeProgram(shop, { mode: 'stamps', target: 3 })
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      expect(await claim(customer, qr.token)).toMatchObject({ ok: true, value: { card: { target: 3 } } })
      expect((await cardsOf(customer))[0]?.programId).toBe(newProgramId)
    }, SLOW)
  })

  describe('typed code', () => {
    it('uses the newest QR with that code, so an older used one does not shadow the live one', async () => {
      const shop = await data.createShop()
      const [old, live] = [
        await data.createVisitQr({ shopId: shop.id, createdAt: at(-HOUR_MS), status: 'expired' }),
        await data.createVisitQr({ shopId: shop.id, createdAt: T0 }),
      ]
      await data.db.update(visitQrs).set({ visitCode: live.visitCode }).where(eq(visitQrs.id, old.id))
      const customer = await data.createCustomer()
      clock.current = T0
      expect(await service.claimVisitQr(customer, { visitCode: live.visitCode })).toMatchObject({ ok: true })
      expect((await qrRow(live.id)).status).toBe('claimed')
      expect((await qrRow(old.id)).status).toBe('expired')
    }, SLOW)

    it('accepts the code the way people type it', async () => {
      const shop = await data.createShop()
      const customer = await data.createCustomer()
      const qr = await data.createVisitQr({ shopId: shop.id, createdAt: T0 })
      clock.current = T0
      const typed = `${qr.visitCode.slice(0, 2).toLowerCase()}-${qr.visitCode.slice(2)}`
      expect(await service.claimVisitQr(customer, { visitCode: typed })).toMatchObject({ ok: true })
    }, SLOW)
  })

  describe('the searches use an index (the test table is tiny, so the planner is told not to scan it in sequence)', () => {
    it('finds a QR by the hash of its token through the unique index', async () => {
      const scans = await data.scansWithoutSeqScan(repository.lookupQuery({ kind: 'tokenHash', tokenHash: hashVisitToken(generateVisitToken()) }))
      const onQrs = scans.filter((scan) => scan.relation === 'visit_qrs')
      expect(onQrs.map((scan) => scan.node)).not.toContain('Seq Scan')
      expect(onQrs.map((scan) => scan.index)).toContain('visit_qrs_token_hash_uq')
    }, SLOW)

    it('finds the newest QR of a typed code through the (code, newest first) index', async () => {
      const scans = await data.scansWithoutSeqScan(repository.lookupQuery({ kind: 'visitCode', code: VisitCodeSchema.parse('K7M4P') }))
      const onQrs = scans.filter((scan) => scan.relation === 'visit_qrs')
      expect(onQrs.map((scan) => scan.node)).not.toContain('Seq Scan')
      expect(onQrs.map((scan) => scan.index)).toContain('visit_qrs_code_created_idx')
    }, SLOW)

    it('locks the QR through its primary key', async () => {
      const scans = await data.scansWithoutSeqScan(repository.lockQuery(data.db, '0190a000-0000-7000-8000-0000000000d1'))
      const onQrs = scans.filter((scan) => scan.relation === 'visit_qrs')
      expect(onQrs.map((scan) => scan.node)).not.toContain('Seq Scan')
      expect(onQrs.map((scan) => scan.index)).toContain('visit_qrs_pkey')
    }, SLOW)
  })

  describe('constraints of the table', () => {
    async function insertQr(overrides: Partial<typeof visitQrs.$inferInsert>) {
      const shop = await data.createShop()
      return data.db.insert(visitQrs).values({
        shopId: shop.id,
        programId: shop.programId,
        issuedBy: await ownerOf(shop.id),
        tokenHash: hashVisitToken(generateVisitToken()),
        visitCode: 'ABCDE',
        earnKind: 'visit',
        expiresAt: at(5 * MINUTE_MS),
        createdAt: T0,
        ...overrides,
      })
    }

    it.each([
      ['an amount QR without an amount', { earnKind: 'amount' as const }],
      ['a visit QR with an amount', { earnKind: 'visit' as const, amountCents: 100 }],
      ['an amount above the ceiling', { earnKind: 'amount' as const, amountCents: 1_000_001 }],
      ['a cancelled QR without a reason', { status: 'cancelled' as const }],
      ['a reason on a QR that is not cancelled', { cancelReason: 'merchant' as const }],
      ['a claimed QR without the claim data', { status: 'claimed' as const }],
      ['a QR that expires before it was created', { expiresAt: at(-MINUTE_MS) }],
    ])('refuses %s', async (_name, overrides) => {
      await expect(insertQr(overrides)).rejects.toThrow()
    }, SLOW)

    it('refuses two active QRs with the same visit code, but accepts the code again once the first is no longer active', async () => {
      const shop = await data.createShop()
      const base = { shopId: shop.id, programId: shop.programId, issuedBy: await ownerOf(shop.id), visitCode: 'QRSTU', earnKind: 'visit' as const, createdAt: T0, expiresAt: at(5 * MINUTE_MS) }
      await data.db.insert(visitQrs).values({ ...base, tokenHash: hashVisitToken(generateVisitToken()) })
      await expect(data.db.insert(visitQrs).values({ ...base, tokenHash: hashVisitToken(generateVisitToken()) })).rejects.toThrow()
      await data.db.update(visitQrs).set({ status: 'cancelled', cancelReason: 'merchant' }).where(and(eq(visitQrs.shopId, shop.id), eq(visitQrs.visitCode, 'QRSTU')))
      await expect(data.db.insert(visitQrs).values({ ...base, tokenHash: hashVisitToken(generateVisitToken()) })).resolves.toBeDefined()
    }, SLOW)
  })
})
