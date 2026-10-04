import { eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { appUsers, customerProfiles, loyaltyCards, ledgerEntries, redemptions } from '../../database/schema'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
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
  let checkIn: CheckInService
  const ledger = new LedgerStore()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    service = new AccountService(new DrizzleAccountRepository(data.db), new SystemClock())
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), new SystemClock(), new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  it('wipes name, birthday, contact and ranking, expires open codes, and keeps the ledger without personal data', async () => {
    const shop = await data.createShop({ rules: { mode: 'stamps', target: 3 } })
    const me = await data.createCustomer({ birthday: '10-05' })
    await data.db.update(customerProfiles).set({ firstName: 'Ana', rankingOptIn: true, rankingName: 'Aninha', notificationsConsent: true }).where(eq(customerProfiles.userId, me))
    await checkIn.checkIn(me, shop.checkInCode)
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
})
