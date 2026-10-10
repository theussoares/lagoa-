import { beforeEach, describe, expect, it } from 'vitest'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { createTestPii } from '../../test-support/pii'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import type { CustomersRepository, RawCustomerCardRow } from './customers.repository'
import { CustomersService } from './customers.service'

class FakeClock extends Clock {
  constructor(private currentTime: Date) {
    super()
  }

  now(): Date {
    return this.currentTime
  }

  setTime(time: Date): void {
    this.currentTime = time
  }
}

class FakeSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = null

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

class FakeCustomersRepository implements CustomersRepository {
  rows: RawCustomerCardRow[] = []

  async listShopCustomers(_shopId: string): Promise<RawCustomerCardRow[]> {
    return this.rows
  }
}

describe('CustomersService', () => {
  let pii: PiiService
  let clock: FakeClock
  let sessionRepo: FakeSessionRepository
  let customersRepo: FakeCustomersRepository
  let service: CustomersService

  const ownerUserId = '018f98a2-7b2a-7182-9f33-6d004bbbb001'
  const shopId = '018f98a2-7b2a-7182-9f33-6d004bbbb002'

  beforeEach(() => {
    pii = createTestPii()
    clock = new FakeClock(new Date('2026-10-08T12:00:00Z'))
    sessionRepo = new FakeSessionRepository()
    sessionRepo.shop = {
      id: shopId,
      ownerUserId,
      name: 'Padaria Central',
      status: 'approved',
      merchantTermsVersion: null,
    }
    customersRepo = new FakeCustomersRepository()
    service = new CustomersService(sessionRepo, customersRepo, pii, clock)
  })

  it('retorna notFound se a loja do lojista não existir', async () => {
    sessionRepo.shop = null
    const result = await service.listCustomers(ownerUserId, 'all')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('notFound')
    }
  })

  it('mascara o celular decifrado e nunca expõe o telefone em claro (LGPD)', async () => {
    const rawPhone = '67999990374'
    customersRepo.rows = [
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb010',
        phoneEncrypted: pii.encrypt(rawPhone),
        firstName: 'Maria',
        unit: 'stamp',
        balance: 5,
        target: 10,
        visitsCount: 3,
        lastVisitAt: new Date('2026-10-06T10:00:00Z'),
        acceptsNotifications: true,
      },
    ]

    const result = await service.listCustomers(ownerUserId, 'all')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      const row = result.value[0]!
      expect(row.maskedPhone).toBe('(67) 9••••-0374')
      expect(JSON.stringify(result.value)).not.toContain(rawPhone)
      expect(row.firstName).toBe('Maria')
      expect(row.unit).toBe('stamp')
      expect(row.balance).toBe(5)
      expect(row.target).toBe(10)
      expect(row.visitsCount).toBe(3)
      expect(row.acceptsNotifications).toBe(true)
      expect(row.isLapsed).toBe(false)
    }
  })

  it('filtra clientes corretamente por all, lapsed e rewardReady', async () => {
    // Clock: 2026-10-08T12:00:00Z
    // 35 dias atrás: 2026-09-03
    const phone1 = '67999990001'
    const phone2 = '67999990002'
    const phone3 = '67999990003'

    customersRepo.rows = [
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb011',
        phoneEncrypted: pii.encrypt(phone1),
        firstName: 'Lapsed Customer',
        unit: 'stamp',
        balance: 2,
        target: 10,
        visitsCount: 1,
        lastVisitAt: new Date('2026-09-01T10:00:00Z'), // > 30 dias atrás
        acceptsNotifications: true,
      },
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb012',
        phoneEncrypted: pii.encrypt(phone2),
        firstName: 'Reward Ready Customer',
        unit: 'stamp',
        balance: 10,
        target: 10,
        visitsCount: 10,
        lastVisitAt: new Date('2026-10-07T10:00:00Z'), // recente
        acceptsNotifications: false,
      },
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb013',
        phoneEncrypted: pii.encrypt(phone3),
        firstName: 'Regular Customer',
        unit: 'stamp',
        balance: 4,
        target: 10,
        visitsCount: 4,
        lastVisitAt: new Date('2026-10-05T10:00:00Z'), // recente
        acceptsNotifications: true,
      },
    ]

    const allResult = await service.listCustomers(ownerUserId, 'all')
    expect(allResult.ok).toBe(true)
    if (allResult.ok) {
      expect(allResult.value).toHaveLength(3)
    }

    const lapsedResult = await service.listCustomers(ownerUserId, 'lapsed')
    expect(lapsedResult.ok).toBe(true)
    if (lapsedResult.ok) {
      expect(lapsedResult.value).toHaveLength(1)
      expect(lapsedResult.value[0]!.firstName).toBe('Lapsed Customer')
      expect(lapsedResult.value[0]!.isLapsed).toBe(true)
    }

    const rewardResult = await service.listCustomers(ownerUserId, 'rewardReady')
    expect(rewardResult.ok).toBe(true)
    if (rewardResult.ok) {
      expect(rewardResult.value).toHaveLength(1)
      expect(rewardResult.value[0]!.firstName).toBe('Reward Ready Customer')
      expect(rewardResult.value[0]!.balance).toBe(10)
    }
  })
})
