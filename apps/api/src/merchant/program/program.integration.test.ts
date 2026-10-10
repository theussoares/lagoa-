import { and, eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Clock, SystemClock } from '../../common/clock'
import { CheckInService } from '../../customer/check-in/check-in.service'
import { DrizzleCheckInRepository } from '../../customer/check-in/drizzle-check-in.repository'
import { loyaltyCards, programs, shops } from '../../database/schema'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../../ledger/ledger.store'
import { claimVisit } from '../../test-support/claim-visit'
import { NO_BONUS_RULES, TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { DrizzleProgramRepository } from './drizzle-program.repository'
import { ProgramService } from './program.service'

const SLOW = 60_000

/** CA-14 / CA-15: trocar o programa vira versão nova; quem está no meio do cartão termina na versão em que começou. */
describe.skipIf(!TEST_DATABASE_URL)('merchant program against a real database', () => {
  let data: TestDatabase
  let service: ProgramService
  let checkIn: CheckInService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    const clock: Clock = new SystemClock()
    service = new ProgramService(new DrizzleProgramRepository(data.db), clock)
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), clock, new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  const ownerOf = async (shopId: string): Promise<string> => {
    const [row] = await data.db.select({ owner: shops.ownerUserId }).from(shops).where(eq(shops.id, shopId))
    if (!row) throw new Error('shop expected')
    return row.owner
  }
  const draftFor = async (owner: string, rules: Parameters<ProgramService['updateProgram']>[1]['rules']) => {
    const current = await service.getProgram(owner)
    if (!current.ok) throw new Error('program expected')
    return { reward: current.value.reward, rules, bonusRules: current.value.bonusRules, expirationPolicy: current.value.expirationPolicy, checkIn: current.value.checkIn }
  }
  const activeProgramIds = async (shopId: string) =>
    (await data.db.select({ id: programs.id }).from(programs).where(and(eq(programs.shopId, shopId), eq(programs.active, true)))).map((row) => row.id)

  it('CA-14: switches stamps to points even with customers holding cards, leaving exactly one active version', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, bonusRules: NO_BONUS_RULES })
    const owner = await ownerOf(shop.id)
    await claimVisit(data, checkIn, await data.createCustomer(), shop)
    const saved = await service.updateProgram(owner, await draftFor(owner, { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 }))
    expect(saved).toMatchObject({ ok: true, value: { rules: { mode: 'pointsPerVisit', target: 100 } } })
    expect(await activeProgramIds(shop.id)).toHaveLength(1)
    expect((await data.db.select({ id: programs.id }).from(programs).where(eq(programs.shopId, shop.id)))).toHaveLength(2)
  }, SLOW)

  it('CA-15: a card in progress keeps its version and balance; a new customer gets the new version', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, bonusRules: NO_BONUS_RULES })
    const owner = await ownerOf(shop.id)
    const veteran = await data.createCustomer()
    await claimVisit(data, checkIn, veteran, shop)
    const [before] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, veteran))
    expect(before?.balance).toBe(1)

    await service.updateProgram(owner, await draftFor(owner, { mode: 'stamps', target: 12 }))
    const [newVersion] = await activeProgramIds(shop.id)

    const [after] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, veteran))
    expect(after).toMatchObject({ balance: 1, programId: before?.programId })
    expect(before?.programId).not.toBe(newVersion)

    const newcomer = await data.createCustomer()
    await claimVisit(data, checkIn, newcomer, shop)
    expect((await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, newcomer)))[0]?.programId).toBe(newVersion)
  }, SLOW)

  it('a QR issued before the change answers visitQrStale to the customer (it was cancelled as programChanged)', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, bonusRules: NO_BONUS_RULES })
    const owner = await ownerOf(shop.id)
    const old = await data.createVisitQr({ shopId: shop.id })
    await service.updateProgram(owner, await draftFor(owner, { mode: 'stamps', target: 12 }))
    expect(await checkIn.claimVisitQr(await data.createCustomer(), { token: old.token })).toEqual({ ok: false, error: { code: 'visitQrStale' } })
  }, SLOW)

  it('changing only the reward title does not create a version nor cancel QRs', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 10 }, bonusRules: NO_BONUS_RULES })
    const owner = await ownerOf(shop.id)
    const [before] = await activeProgramIds(shop.id)
    const qr = await data.createVisitQr({ shopId: shop.id })
    const current = await draftFor(owner, { mode: 'stamps', target: 10 })
    await service.updateProgram(owner, { ...current, reward: { title: 'Outro prêmio' } })
    expect(await activeProgramIds(shop.id)).toEqual([before])
    expect(await checkIn.claimVisitQr(await data.createCustomer(), { token: qr.token })).toMatchObject({ ok: true })
  }, SLOW)
})
