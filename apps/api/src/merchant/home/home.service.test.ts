import { beforeEach, describe, expect, it } from 'vitest'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import { Clock } from '../../common/clock'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import type { HomeRepository } from './home.repository'
import { HomeService } from './home.service'

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

class FakeHomeRepository implements HomeRepository {
  records: WeekLedgerRecord[] = []

  async listShopLedgerRecords(_shopId: string): Promise<WeekLedgerRecord[]> {
    return this.records
  }
}

describe('HomeService', () => {
  let clock: FakeClock
  let sessionRepo: FakeSessionRepository
  let homeRepo: FakeHomeRepository
  let service: HomeService

  const ownerUserId = '018f98a2-7b2a-7182-9f33-6d004bbbb001'
  const shopId = '018f98a2-7b2a-7182-9f33-6d004bbbb002'

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-10-08T12:00:00Z'))
    sessionRepo = new FakeSessionRepository()
    sessionRepo.shop = {
      id: shopId,
      ownerUserId,
      name: 'Padaria Central',
      status: 'approved',
    }
    homeRepo = new FakeHomeRepository()
    service = new HomeService(sessionRepo, homeRepo, clock)
  })

  it('retorna notFound se a loja do lojista não existir', async () => {
    sessionRepo.shop = null
    const result = await service.getWeekSummary(ownerUserId)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('notFound')
    }
  })

  it('retorna resumo vazio de 7 dias com contagens zeradas quando a loja não tem registros', async () => {
    homeRepo.records = []
    const result = await service.getWeekSummary(ownerUserId)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.days).toHaveLength(7)
      expect(result.value.visits).toBe(0)
      expect(result.value.customers).toBe(0)
      expect(result.value.newCustomers).toBe(0)
      expect(result.value.redemptions).toBe(0)
    }
  })

  it('calcula o resumo da semana agregando visitas, novos clientes e resgates', async () => {
    const cust1 = '018f98a2-7b2a-7182-9f33-6d004bbbb011' as any
    const cust2 = '018f98a2-7b2a-7182-9f33-6d004bbbb012' as any

    homeRepo.records = [
      // cust1 visitou hoje (novo cliente)
      { customerId: cust1, kind: 'visit', createdAt: '2026-10-08T10:00:00Z' as any },
      // cust2 visitou 2 dias atrás (novo cliente naquele dia)
      { customerId: cust2, kind: 'visit', createdAt: '2026-10-06T10:00:00Z' as any },
      // cust2 visitou hoje de novo (visita repetida, não é novo cliente hoje)
      { customerId: cust2, kind: 'visit', createdAt: '2026-10-08T11:00:00Z' as any },
      // resgate entregue hoje
      { customerId: cust2, kind: 'redemption', createdAt: '2026-10-08T11:05:00Z' as any },
    ]

    const result = await service.getWeekSummary(ownerUserId)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.days).toHaveLength(7)
      expect(result.value.visits).toBe(3)
      expect(result.value.customers).toBe(2)
      expect(result.value.newCustomers).toBe(2)
      expect(result.value.redemptions).toBe(1)
    }
  })
})
