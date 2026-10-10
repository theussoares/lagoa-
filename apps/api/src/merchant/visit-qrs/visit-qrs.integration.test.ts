import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { VISIT_QR_ACTIVE_MAX_PER_SHOP } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { Clock, SystemClock } from '../../common/clock'
import { AccountService } from '../../customer/account/account.service'
import { DrizzleAccountRepository } from '../../customer/account/drizzle-account.repository'
import { CheckInService } from '../../customer/check-in/check-in.service'
import { DrizzleCheckInRepository } from '../../customer/check-in/drizzle-check-in.repository'
import { programs, shops, visitQrs } from '../../database/schema'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../../ledger/ledger.store'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleProgramRepository } from '../program/drizzle-program.repository'
import { ProgramService } from '../program/program.service'
import { DrizzleSessionRepository } from '../session/drizzle-session.repository'
import { DrizzleVisitQrsRepository } from './drizzle-visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'
import { VisitQrsService } from './visit-qrs.service'

const SLOW = 60_000

class FixedClock extends Clock {
  constructor(public current: Date) {
    super()
  }
  now(): Date {
    return this.current
  }
}

describe.skipIf(!TEST_DATABASE_URL)('merchant visit QRs against a real database', () => {
  let data: TestDatabase
  let clock: FixedClock
  let service: VisitQrsService
  let programService: ProgramService
  let checkIn: CheckInService
  const ledger = new LedgerStore()
  const pii = createTestPii()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    clock = new FixedClock(new Date())
    service = new VisitQrsService(new DrizzleVisitQrsRepository(data.db, pii), new DrizzleSessionRepository(data.db), new VisitQrsRules(), clock)
    programService = new ProgramService(new DrizzleProgramRepository(data.db), clock)
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  const ownerOf = async (shopId: string): Promise<string> => {
    const [row] = await data.db.select({ owner: shops.ownerUserId }).from(shops).where(eq(shops.id, shopId))
    if (!row) throw new Error('shop expected')
    return row.owner
  }
  const activeCount = async (shopId: string): Promise<number> =>
    (await data.db.select({ id: visitQrs.id }).from(visitQrs).where(and(eq(visitQrs.shopId, shopId), eq(visitQrs.status, 'active')))).length

  it('CA-08: stops at the live QR limit, even when many are issued at the same time', async () => {
    const shop = await data.createShop()
    const owner = await ownerOf(shop.id)
    const results = await Promise.all(Array.from({ length: VISIT_QR_ACTIVE_MAX_PER_SHOP + 6 }, () => service.issueVisitQr(owner, {})))
    expect(results.filter((result) => result.ok)).toHaveLength(VISIT_QR_ACTIVE_MAX_PER_SHOP)
    expect(results.filter((result) => !result.ok && result.error.code === 'visitQrLimitReached')).toHaveLength(6)
    expect(await activeCount(shop.id)).toBe(VISIT_QR_ACTIVE_MAX_PER_SHOP)
  }, SLOW)

  it('does not count QRs past their time, and frees them for the next issue', async () => {
    const shop = await data.createShop()
    const owner = await ownerOf(shop.id)
    const longAgo = new Date(clock.now().getTime() - 60 * 60_000)
    for (let i = 0; i < VISIT_QR_ACTIVE_MAX_PER_SHOP; i++) await data.createVisitQr({ shopId: shop.id, createdAt: longAgo })
    expect(await service.issueVisitQr(owner, {})).toMatchObject({ ok: true })
    const rows = await data.db.select({ status: visitQrs.status }).from(visitQrs).where(eq(visitQrs.shopId, shop.id))
    expect(rows.filter((row) => row.status === 'expired')).toHaveLength(VISIT_QR_ACTIVE_MAX_PER_SHOP)
    expect(await activeCount(shop.id)).toBe(1)
  }, SLOW)

  it('draws another short code when the first one is held by a live QR of another shop', async () => {
    const [shopA, shopB] = [await data.createShop(), await data.createShop()]
    const held = await data.createVisitQr({ shopId: shopA.id })
    const repo = new DrizzleVisitQrsRepository(data.db, createTestPii())
    const codes = [held.visitCode, held.visitCode, 'ZZ234']
    const issued = await repo.issue({
      shopId: shopB.id,
      issuedBy: await ownerOf(shopB.id),
      now: clock.now(),
      expiresAt: new Date(clock.now().getTime() + 300_000),
      tokenHash: Buffer.from(`hash-${Math.random()}`),
      newVisitCode: () => codes.shift() ?? 'ZZ234',
      plan: () => ({ ok: true, value: { kind: 'visit' } }),
    })
    expect(issued).toMatchObject({ ok: true, value: { visitCode: 'ZZ234' } })
    expect(codes).toHaveLength(0)
  }, SLOW)

  it('CA-11: issuing while the program changes never leaves a live QR on the old version', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 } })
    const owner = await ownerOf(shop.id)
    for (let round = 0; round < 6; round++) {
      const current = await programService.getProgram(owner)
      if (!current.ok) throw new Error('program expected')
      const draft = { reward: current.value.reward, rules: { mode: 'stamps' as const, target: current.value.rules.target + 1 }, bonusRules: current.value.bonusRules, expirationPolicy: current.value.expirationPolicy, checkIn: current.value.checkIn }
      await Promise.all([service.issueVisitQr(owner, {}), service.issueVisitQr(owner, {}), programService.updateProgram(owner, draft), service.issueVisitQr(owner, {})])
      const [active] = await data.db.select({ id: programs.id }).from(programs).where(and(eq(programs.shopId, shop.id), eq(programs.active, true)))
      const stale = (await data.db.select({ programId: visitQrs.programId }).from(visitQrs).where(and(eq(visitQrs.shopId, shop.id), eq(visitQrs.status, 'active')))).filter((row) => row.programId !== active?.id)
      expect(stale, `round ${round}`).toHaveLength(0)
    }
  }, SLOW)

  it('a program change cancels live QRs as programChanged and only expires the ones already past their time', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 } })
    const owner = await ownerOf(shop.id)
    const live = await data.createVisitQr({ shopId: shop.id })
    const lapsed = await data.createVisitQr({ shopId: shop.id, createdAt: new Date(clock.now().getTime() - 3_600_000) })
    const current = await programService.getProgram(owner)
    if (!current.ok) throw new Error('program expected')
    await programService.updateProgram(owner, { reward: current.value.reward, rules: { mode: 'stamps', target: 12 }, bonusRules: current.value.bonusRules, expirationPolicy: current.value.expirationPolicy, checkIn: current.value.checkIn })
    const status = async (id: string) => (await data.db.select({ status: visitQrs.status, reason: visitQrs.cancelReason }).from(visitQrs).where(eq(visitQrs.id, id)))[0]
    expect(await status(live.id)).toEqual({ status: 'cancelled', reason: 'programChanged' })
    expect(await status(lapsed.id)).toEqual({ status: 'expired', reason: null })
  }, SLOW)

  it('cancel is idempotent and never turns an expired QR into a cancelled one', async () => {
    const shop = await data.createShop()
    const owner = await ownerOf(shop.id)
    const issued = await service.issueVisitQr(owner, {})
    if (!issued.ok) throw new Error('issue expected')
    expect(await service.cancelVisitQr(owner, issued.value.id)).toMatchObject({ ok: true, value: { status: 'cancelled' } })
    expect(await service.cancelVisitQr(owner, issued.value.id)).toMatchObject({ ok: true, value: { status: 'cancelled' } })
    const lapsed = await data.createVisitQr({ shopId: shop.id, createdAt: new Date(clock.now().getTime() - 3_600_000) })
    expect(await service.cancelVisitQr(owner, lapsed.id)).toMatchObject({ ok: true, value: { status: 'expired' } })
    expect((await data.db.select({ status: visitQrs.status }).from(visitQrs).where(eq(visitQrs.id, lapsed.id)))[0]?.status).toBe('active')
  }, SLOW)

  it('CA-12: the receipt of a QR used by someone whose account was erased says "removed customer" (no phone, no 500)', async () => {
    const shop = await data.createShop()
    const owner = await ownerOf(shop.id)
    const customer = await data.createCustomer()
    await data.setPhone(customer, pii.encrypt(PhoneNumberSchema.parse('67991230374')))
    const issued = await service.issueVisitQr(owner, {})
    if (!issued.ok) throw new Error('issue expected')
    expect(await checkIn.claimVisitQr(customer, { token: issued.value.token })).toMatchObject({ ok: true })
    const before = await service.getVisitQr(owner, issued.value.id)
    expect(before).toMatchObject({ ok: true, value: { status: 'claimed', claim: { entry: { maskedPhone: expect.stringContaining('•') } } } })

    await new AccountService(new DrizzleAccountRepository(data.db), new SystemClock()).erase(customer)
    const after = await service.getVisitQr(owner, issued.value.id)
    expect(after).toMatchObject({ ok: true, value: { status: 'claimed', claim: { entry: { maskedPhone: null } } } })
  }, SLOW)

  it('CA-03: another merchant cannot read or cancel a QR that is not theirs', async () => {
    const [mine, theirs] = [await data.createShop(), await data.createShop()]
    const issued = await service.issueVisitQr(await ownerOf(mine.id), {})
    if (!issued.ok) throw new Error('issue expected')
    expect(await service.getVisitQr(await ownerOf(theirs.id), issued.value.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'visitQr' } })
    expect(await service.cancelVisitQr(await ownerOf(theirs.id), issued.value.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'visitQr' } })
    expect(await activeCount(mine.id)).toBe(1)
  }, SLOW)

  it('R12: the merchant who owns the shop cannot earn on a QR of their own shop (answers as a QR that does not exist)', async () => {
    const shop = await data.createShop()
    const owner = await ownerOf(shop.id)
    const issued = await service.issueVisitQr(owner, {})
    if (!issued.ok) throw new Error('issue expected')
    // O dono também é cliente (tem perfil): usa o próprio QR.
    await data.db.insert((await import('../../database/schema')).customerProfiles).values({ userId: owner, referralCode: `R${Math.random().toString(36).slice(2, 9).toUpperCase()}`.slice(0, 8) })
    expect(await checkIn.claimVisitQr(owner, { token: issued.value.token })).toEqual({ ok: false, error: { code: 'invalidVisitQr' } })
    expect(await activeCount(shop.id)).toBe(1)
  }, SLOW)
})
