import { beforeEach, describe, expect, it } from 'vitest'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import { CustomerIdSchema } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { IsoDateTime } from '#shared/schemas/common'
import type { HomeActivityItem, HomeMetrics, HomePeriod } from '#shared/schemas/homeOverview'
import type { DateRange } from '#shared/domain/homeComparison'
import { Clock } from '../../common/clock'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import type { HomeRepository, ShopCustomerMetrics } from './home.repository'
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
  customerMetrics: ShopCustomerMetrics = {
    total: 0,
    lapsedTotal: 0,
    nearRewardTotal: 0,
    rewardReadyTotal: 0,
    oldestLastVisitAt: null,
  }
  comparisonMetrics: Record<HomePeriod, HomeMetrics> = {
    week: {
      newCustomers: { current: 0, previous: 0 },
      visits: { current: 0, previous: 0 },
      purchases: { current: 0, previous: 0 },
      redemptions: { current: 0, previous: 0 },
    },
    month: {
      newCustomers: { current: 0, previous: 0 },
      visits: { current: 0, previous: 0 },
      purchases: { current: 0, previous: 0 },
      redemptions: { current: 0, previous: 0 },
    },
    last30: {
      newCustomers: { current: 0, previous: 0 },
      visits: { current: 0, previous: 0 },
      purchases: { current: 0, previous: 0 },
      redemptions: { current: 0, previous: 0 },
    },
  }
  activity: HomeActivityItem[] = []

  async listShopLedgerRecords(_shopId: string): Promise<WeekLedgerRecord[]> {
    return this.records
  }

  async getCustomerMetrics(_shopId: string, _lapsedCutoff: Date): Promise<ShopCustomerMetrics> {
    return this.customerMetrics
  }

  async getComparisonMetrics(
    _shopId: string,
    _ranges: Record<HomePeriod, { current: DateRange; previous: DateRange }>,
  ): Promise<Record<HomePeriod, HomeMetrics>> {
    return this.comparisonMetrics
  }

  async listRecentActivity(_shopId: string): Promise<HomeActivityItem[]> {
    return this.activity
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
      merchantTermsVersion: null,
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

    const overview = await service.getOverview(ownerUserId)
    expect(overview.ok).toBe(false)
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
    const cust1 = CustomerIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb011')
    const cust2 = CustomerIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb012')

    homeRepo.records = [
      // cust1 visitou hoje (novo cliente)
      { customerId: cust1, kind: 'visit', createdAt: '2026-10-08T10:00:00Z' as IsoDateTime },
      // cust2 visitou 2 dias atrás (novo cliente naquele dia)
      { customerId: cust2, kind: 'visit', createdAt: '2026-10-06T10:00:00Z' as IsoDateTime },
      // cust2 visitou hoje de novo (visita repetida, não é novo cliente hoje)
      { customerId: cust2, kind: 'visit', createdAt: '2026-10-08T11:00:00Z' as IsoDateTime },
      // resgate entregue hoje
      { customerId: cust2, kind: 'redemption', createdAt: '2026-10-08T11:05:00Z' as IsoDateTime },
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

  it('retorna overview com lapsed, nearReward, comparison e activity', async () => {
    const cust1 = CustomerIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb011')
    homeRepo.customerMetrics = {
      total: 80,
      lapsedTotal: 12,
      nearRewardTotal: 5,
      rewardReadyTotal: 3,
      oldestLastVisitAt: '2026-08-10T14:00:00Z' as IsoDateTime,
    }
    homeRepo.activity = [
      {
        id: 'ledger_1',
        kind: 'visit',
        customerId: cust1,
        name: 'Carlos',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-1234'),
        units: 1,
        unit: 'stamp',
        amountCents: null,
        rewardTitle: null,
        createdAt: '2026-10-08T11:00:00Z' as IsoDateTime,
      },
    ]

    const result = await service.getOverview(ownerUserId)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.lapsed.total).toBe(12)
      expect(result.value.lapsed.oldestLastVisitAt).toBe('2026-08-10T14:00:00Z')
      expect(result.value.nearReward.total).toBe(5)
      expect(result.value.rewardReady.total).toBe(3)
      expect(result.value.totalCustomers).toBe(80)
      expect(result.value.comparison).toHaveProperty('week')
      expect(result.value.comparison).toHaveProperty('month')
      expect(result.value.comparison).toHaveProperty('last30')
      expect(result.value.activity).toHaveLength(1)
    }
  })
})
