import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import type { DateRange } from '#shared/domain/homeComparison'
import type { HomeActivityItem, HomeMetrics, HomePeriod } from '#shared/schemas/homeOverview'
import { CustomerIdSchema } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { IsoDateTime } from '#shared/schemas/common'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import { HomeController } from './home.controller'
import { HomeRepository, type ShopCustomerMetrics } from './home.repository'
import { HomeService } from './home.service'
import { MerchantShopGuard } from '../access/merchant-shop.guard'

class TestSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
    ownerUserId: TEST_USER.id,
    name: 'Padaria Central',
    status: 'approved',
    merchantTermsVersion: null,
  }

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

class TestHomeRepository extends HomeRepository {
  records: WeekLedgerRecord[] = []

  async listShopLedgerRecords(_shopId: string): Promise<WeekLedgerRecord[]> {
    return this.records
  }

  async getCustomerMetrics(_shopId: string, _lapsedCutoff: Date): Promise<ShopCustomerMetrics> {
    return {
      total: 10,
      lapsedTotal: 2,
      nearRewardTotal: 4,
      rewardReadyTotal: 1,
      oldestLastVisitAt: '2026-08-01T10:00:00.000Z',
    }
  }

  async getComparisonMetrics(
    _shopId: string,
    _ranges: Record<HomePeriod, { current: DateRange; previous: DateRange }>,
  ): Promise<Record<HomePeriod, HomeMetrics>> {
    return {
      week: {
        newCustomers: { current: 1, previous: 0 },
        visits: { current: 2, previous: 1 },
        purchases: { current: 1, previous: 1 },
        redemptions: { current: 0, previous: 0 },
      },
      month: {
        newCustomers: { current: 5, previous: 4 },
        visits: { current: 10, previous: 8 },
        purchases: { current: 6, previous: 5 },
        redemptions: { current: 1, previous: 0 },
      },
      last30: {
        newCustomers: { current: 5, previous: 4 },
        visits: { current: 10, previous: 8 },
        purchases: { current: 6, previous: 5 },
        redemptions: { current: 1, previous: 0 },
      },
    }
  }

  async listRecentActivity(_shopId: string): Promise<HomeActivityItem[]> {
    return [
      {
        id: 'ledger_1',
        kind: 'visit',
        customerId: CustomerIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb011'),
        name: 'Maria',
        maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-9999'),
        units: 1,
        unit: 'stamp',
        amountCents: null,
        rewardTitle: null,
        createdAt: '2026-10-08T10:00:00.000Z' as IsoDateTime,
      },
    ]
  }
}

describe('merchant home HTTP', () => {
  let app: INestApplication
  let sessionRepo: TestSessionRepository
  let homeRepo: TestHomeRepository

  beforeAll(async () => {
    sessionRepo = new TestSessionRepository()
    homeRepo = new TestHomeRepository()

    const moduleRef = await Test.createTestingModule({
      controllers: [HomeController],
      providers: [
        HomeService,
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: HomeRepository, useValue: homeRepo },
        { provide: Clock, useValue: { now: () => new Date('2026-10-08T12:00:00Z') } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      // O guard da loja tem teste próprio (access/merchant-shop.guard.http.test.ts); aqui a loja vem do repositório de teste.
      .overrideGuard(MerchantShopGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    sessionRepo.shop = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
      ownerUserId: TEST_USER.id,
      name: 'Padaria Central',
      status: 'approved',
      merchantTermsVersion: null,
    }
    const cust1 = CustomerIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb011')
    homeRepo.records = [
      { customerId: cust1, kind: 'visit', createdAt: '2026-10-08T10:00:00Z' as IsoDateTime },
    ]
  })

  it('GET /merchant/home/summary returns week summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/home/summary')
      .expect(200)

    expect(response.body.days).toHaveLength(7)
    expect(response.body.visits).toBe(1)
    expect(response.body.customers).toBe(1)
  })

  it('GET /merchant/home/week-summary also returns week summary', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/home/week-summary')
      .expect(200)

    expect(response.body.days).toHaveLength(7)
    expect(response.body.visits).toBe(1)
    expect(response.body.customers).toBe(1)
  })

  it('GET /merchant/home/overview returns home overview', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/home/overview')
      .expect(200)

    expect(response.body.lapsed.total).toBe(2)
    expect(response.body.nearReward.total).toBe(4)
    expect(response.body.rewardReady.total).toBe(1)
    expect(response.body.totalCustomers).toBe(10)
    expect(response.body.comparison).toHaveProperty('week')
    expect(response.body.activity).toHaveLength(1)
  })

  it('GET /merchant/home/summary returns 404 when shop not found', async () => {
    sessionRepo.shop = null
    const response = await request(app.getHttpServer())
      .get('/merchant/home/summary')
      .expect(404)

    expect(response.body).toEqual({ code: 'notFound', entity: 'merchant' })
  })
})
