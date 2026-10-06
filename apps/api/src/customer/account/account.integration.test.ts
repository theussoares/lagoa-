import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { appUsers, customerProfiles, loyaltyCards, ledgerEntries, redemptions, visitQrs } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { claimVisit } from '../../test-support/claim-visit'
import { LedgerStore } from '../../ledger/ledger.store'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { CheckInService } from '../check-in/check-in.service'
import { DrizzleCheckInRepository } from '../check-in/drizzle-check-in.repository'
import { AccountService } from './account.service'
import { DrizzleAccountRepository } from './drizzle-account.repository'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('account erasure against a real database', () => {
  let data: TestDatabase
  let service: AccountService
  let accounts: DrizzleAccountRepository
  let checkIn: CheckInService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    accounts = new DrizzleAccountRepository(data.db)
    service = new AccountService(accounts, new SystemClock())
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  it('wipes name, birthday, contact and ranking, expires open codes, and keeps the ledger without personal data', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 } })
    const me = await data.createCustomer({ birthday: '10-05' })
    await data.db.update(customerProfiles).set({ firstName: 'Ana', rankingOptIn: true, rankingName: 'Aninha', notificationsConsent: true }).where(eq(customerProfiles.userId, me))
    await claimVisit(data, checkIn, me, shop)
    const [card] = await data.db.select().from(loyaltyCards).where(eq(loyaltyCards.customerId, me))
    await data.db.insert(redemptions).values({ cardId: card?.id ?? '', shopId: shop.id, rewardTitle: 'x', code: 'ZZ2345', expiresAt: new Date(Date.now() + 600_000) })

    expect(await service.erase(me)).toEqual({ ok: true, value: undefined })

    const [profile] = await data.db.select().from(customerProfiles).where(eq(customerProfiles.userId, me))
    expect(profile).toMatchObject({ firstName: null, birthday: null, rankingOptIn: false, rankingName: null, notificationsConsent: false })
    const [user] = await data.db.select().from(appUsers).where(eq(appUsers.id, me))
    expect(user).toMatchObject({ emailEncrypted: null, emailHash: null })
    expect(user?.phoneEncrypted.length).toBe(0)
    expect((await data.db.select().from(redemptions).where(eq(redemptions.cardId, card?.id ?? '')))[0]?.status).toBe('expired')
    expect(await data.db.select().from(ledgerEntries).where(eq(ledgerEntries.customerId, me))).toHaveLength(1)
  }, SLOW)

  it('clears who used a visit QR but keeps the QR claimed and linked to its ledger entry', async () => {
    const shop = await data.createShop()
    const [me, other] = [await data.createCustomer(), await data.createCustomer()]
    const qr = await data.createVisitQr({ shopId: shop.id })
    expect(await checkIn.claimVisitQr(me, { token: qr.token })).toMatchObject({ ok: true })
    const [before] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, qr.id))
    expect(before).toMatchObject({ status: 'claimed', claimedBy: me })

    expect(await service.erase(me)).toEqual({ ok: true, value: undefined })

    const [after] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, qr.id))
    expect(after).toMatchObject({ status: 'claimed', claimedBy: null, ledgerEntryId: before?.ledgerEntryId })
    expect(after?.claimedAt).not.toBeNull()
    // Sem dono, o QR não serve a mais ninguém.
    expect(await checkIn.claimVisitQr(other, { token: qr.token })).toEqual({ ok: false, error: { code: 'visitQrAlreadyUsed' } })
  }, SLOW)

  it('leaves the visit QRs of other customers alone', async () => {
    const shop = await data.createShop()
    const [me, other] = [await data.createCustomer(), await data.createCustomer()]
    const [mine, theirs] = [await data.createVisitQr({ shopId: shop.id }), await data.createVisitQr({ shopId: shop.id })]
    await checkIn.claimVisitQr(me, { token: mine.token })
    await checkIn.claimVisitQr(other, { token: theirs.token })
    await service.erase(me)
    const [kept] = await data.db.select().from(visitQrs).where(eq(visitQrs.id, theirs.id))
    expect(kept).toMatchObject({ status: 'claimed', claimedBy: other })
  }, SLOW)

  it('answers notFound when there is no customer profile', async () => {
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await service.erase(ghost)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  }, SLOW)

  it('removes the login row when the auth schema exists', async () => {
    await data.db.execute(sql`create schema if not exists auth`)
    await data.db.execute(sql`create table if not exists auth.users (id uuid primary key)`)
    const me = await data.createCustomer()
    await data.db.execute(sql`insert into auth.users (id) values (${me})`)
    await service.erase(me)
    expect(await data.db.execute(sql`select id from auth.users where id = ${me}`)).toHaveLength(0)
  }, SLOW)

  it('clears the claims of a person through the partial index on claimed_by, not a scan of the whole table', async () => {
    const scans = await data.scansWithoutSeqScan(accounts.clearVisitQrClaimsQuery(data.db, '0190a000-0000-7000-8000-0000000000d2'))
    const onQrs = scans.filter((scan) => scan.relation === 'visit_qrs')
    expect(onQrs.map((scan) => scan.node)).not.toContain('Seq Scan')
    expect(onQrs.map((scan) => scan.index)).toContain('visit_qrs_claimed_by_idx')
  }, SLOW)
})
