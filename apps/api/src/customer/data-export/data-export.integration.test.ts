import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SystemClock } from '../../common/clock'
import { DrizzleReferralSettlement } from '../../ledger/drizzle-referral-settlement'
import { LedgerStore } from '../../ledger/ledger.store'
import { createTestPii } from '../../test-support/pii'
import { TEST_DATABASE_URL, TestDatabase } from '../../test-support/test-database'
import { claimVisit } from '../../test-support/claim-visit'
import { CheckInService } from '../check-in/check-in.service'
import { DrizzleCheckInRepository } from '../check-in/drizzle-check-in.repository'
import { DrizzleProfileRepository } from '../profile/drizzle-profile.repository'
import { ProfileService } from '../profile/profile.service'
import { DrizzleDataExportRepository } from './drizzle-data-export.repository'
import { DataExportService } from './data-export.service'

const SLOW = 30_000

describe.skipIf(!TEST_DATABASE_URL)('data export against a real database', () => {
  let data: TestDatabase
  let service: DataExportService
  let checkIn: CheckInService
  const ledger = new LedgerStore()
  const pii = createTestPii()

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
    const clock = new SystemClock()
    service = new DataExportService(new DrizzleDataExportRepository(data.db), new ProfileService(new DrizzleProfileRepository(data.db), pii, clock), clock)
    checkIn = new CheckInService(new DrizzleCheckInRepository(data.db, ledger), clock, new DrizzleReferralSettlement(data.db, ledger))
  })

  afterAll(async () => data.close())

  it('returns only the requester data, with the phone masked', async () => {
    const shop = await data.createShop()
    const [me, other] = [await data.createCustomer(), await data.createCustomer()]
    await data.setPhone(me, pii.encrypt('67991230374'))
    await claimVisit(data, checkIn, me, shop)
    await claimVisit(data, checkIn, other, shop)

    const result = await service.export(me)
    expect(result).toMatchObject({
      ok: true,
      value: { profile: { id: me, maskedPhone: '(67) 9••••-0374' }, cards: [{ shopName: 'Loja de teste', balance: 1 }], ledger: [{ kind: 'visit', units: 1 }], redemptions: [], referrals: { pending: 0, rewarded: 0, rejected: 0 } },
    })
    expect(result.ok && result.value.cards).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain('67991230374')
  }, SLOW)

  it('answers notFound for a login with no customer profile', async () => {
    const ghost = await data.createCustomer({ withProfile: false })
    expect(await service.export(ghost)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  }, SLOW)
})
