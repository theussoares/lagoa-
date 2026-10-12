import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MERCHANT_CUSTOMERS_PAGE_SIZE } from '#shared/constants/domain'
import { lapsedCutoff } from '#shared/domain/customer'
import type { Clock } from '../../common/clock'
import type { PiiService } from '../../common/pii.service'
import { createTestPii } from '../../test-support/pii'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import { FakeCustomersRepository, rawCustomer } from './customers.fixtures'
import { CustomersService } from './customers.service'

const NOW = new Date('2026-10-08T12:00:00Z')
const ownerUserId = '018f98a2-7b2a-7182-9f33-6d004bbbb001'
const shopId = '018f98a2-7b2a-7182-9f33-6d004bbbb002'

class FakeSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = null

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

describe('CustomersService', () => {
  let pii: PiiService
  let sessionRepo: FakeSessionRepository
  let customersRepo: FakeCustomersRepository
  let service: CustomersService

  beforeEach(() => {
    pii = createTestPii()
    sessionRepo = new FakeSessionRepository()
    sessionRepo.shop = { id: shopId, ownerUserId, name: 'Padaria Central', status: 'approved', merchantTermsVersion: null }
    customersRepo = new FakeCustomersRepository()
    const clock: Clock = { now: () => NOW }
    service = new CustomersService(sessionRepo, customersRepo, pii, clock)
  })

  it('answers notFound when the owner has no shop, without querying customers', async () => {
    sessionRepo.shop = null
    expect(await service.listCustomers(ownerUserId, 'all')).toEqual({ ok: false, error: { code: 'notFound', entity: 'merchant' } })
    expect(customersRepo.pageQueries).toEqual([])
  })

  it('masks the decrypted phone and never returns it in clear (LGPD)', async () => {
    customersRepo.rows = [rawCustomer(pii, 10, { firstName: 'Maria', balance: 5, visitsCount: 3, acceptsNotifications: true })]
    const result = await service.listCustomers(ownerUserId, 'all')
    if (!result.ok) throw new Error('page expected')
    expect(result.value.items).toEqual([
      expect.objectContaining({ maskedPhone: '(67) 9••••-0010', firstName: 'Maria', balance: 5, visitsCount: 3, isLapsed: false, acceptsNotifications: true }),
    ])
    expect(JSON.stringify(result.value)).not.toContain('67999990010')
  })

  it('scopes the query to the owner shop and pushes filter and lapsed cutoff down to the repository', async () => {
    await service.listCustomers(ownerUserId, 'lapsed', '018f98a2-7b2a-7182-9f33-6d004bbbb099')
    const scope = { shopId, filter: 'lapsed', lapsedCutoff: lapsedCutoff(NOW) }
    expect(customersRepo.pageQueries).toEqual([{ ...scope, after: '018f98a2-7b2a-7182-9f33-6d004bbbb099', limit: MERCHANT_CUSTOMERS_PAGE_SIZE + 1 }])
    expect(customersRepo.countScopes).toEqual([scope])
  })

  it('returns one page with a cursor when there is more, decrypting only the phones it shows', async () => {
    customersRepo.rows = Array.from({ length: MERCHANT_CUSTOMERS_PAGE_SIZE + 1 }, (_, index) => rawCustomer(pii, index))
    customersRepo.counts = { total: 120, acceptingNotifications: 30 }
    const decrypt = vi.spyOn(pii, 'decrypt')

    const result = await service.listCustomers(ownerUserId, 'all')
    if (!result.ok) throw new Error('page expected')
    expect(result.value.items).toHaveLength(MERCHANT_CUSTOMERS_PAGE_SIZE)
    expect(result.value.nextCursor).toBe(customersRepo.rows[MERCHANT_CUSTOMERS_PAGE_SIZE - 1]?.customerId)
    expect(result.value).toMatchObject({ total: 120, acceptingNotifications: 30 })
    expect(decrypt).toHaveBeenCalledTimes(MERCHANT_CUSTOMERS_PAGE_SIZE)
  })

  it('has no cursor on the last page', async () => {
    customersRepo.rows = [rawCustomer(pii, 1), rawCustomer(pii, 2)]
    const result = await service.listCustomers(ownerUserId, 'all')
    expect(result).toMatchObject({ ok: true, value: { nextCursor: null } })
  })

  it('marks lapsed rows with the shared rule', async () => {
    customersRepo.rows = [rawCustomer(pii, 1, { lastVisitAt: new Date('2026-09-01T10:00:00Z') })]
    const result = await service.listCustomers(ownerUserId, 'lapsed')
    expect(result).toMatchObject({ ok: true, value: { items: [{ isLapsed: true }] } })
  })
})
