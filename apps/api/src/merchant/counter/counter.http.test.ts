import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { CounterController } from './counter.controller'
import {
  CounterRepository,
  type ResolvedCustomer,
  type ShopWithProgram,
} from './counter.repository'
import { CounterService } from './counter.service'
import type { EarnInput } from '#shared/domain/programStrategies'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { ReferralSettlement, type SettlementOutcome } from '../../ledger/referral-settlement'
import { createTestPii } from '../../test-support/pii'

const pii = createTestPii()

class FakeReferralSettlement implements ReferralSettlement {
  async settlePending(): Promise<SettlementOutcome> {
    return 'rewarded'
  }
}

class TestCounterRepository extends CounterRepository {
  shop: ShopWithProgram = {
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb001',
    shopName: 'Café do Lago',
    shopStatus: 'approved',
    programId: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
    rewardTitle: 'Café grátis',
    mode: 'stamps',
    unit: 'stamp',
    earnPer: 'visit',
    earnUnits: 1,
    target: 10,
    bonusRules: {
      welcomeBonus: { enabled: true, units: 2 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: false, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationKind: 'never',
    expirationMonths: null,
    checkInCooldownHours: 4,
  }

  async findShopAndProgramByOwner(ownerUserId: string): Promise<ShopWithProgram | null> {
    return this.shop
  }

  async resolveOrCreateCustomer(phone: string): Promise<ResolvedCustomer> {
    return {
      customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb222',
      birthday: null,
      isNewCustomer: false,
      phone,
    }
  }

  async recordVisit(
    shop: ShopWithProgram,
    customer: ResolvedCustomer,
    input: EarnInput,
  ): Promise<{ visit: VisitRegistered; isFirstVisit: boolean }> {
    const visit: VisitRegistered = {
      entry: {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb333' as any,
        shopId: shop.shopId as any,
        maskedPhone: '(67) 9••••-4567' as any,
        kind: input.kind === 'amount' ? 'amount' : 'visit',
        unit: shop.unit,
        units: 1,
        amountCents: input.kind === 'amount' ? input.amountCents : null,
        rewardTitle: null,
        isNewCustomer: false,
        createdAt: new Date().toISOString(),
      },
      card: {
        cardId: '018f98a2-7b2a-7182-9f33-6d004bbbb444' as any,
        unit: shop.unit,
        balance: 1,
        target: shop.target,
        rewardReady: false,
      },
      unitsEarned: 1,
      welcomeUnits: 0,
    }
    return { visit, isFirstVisit: false }
  }

  async listTodayEntries(): Promise<CounterEntry[]> {
    return [
      {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb333' as any,
        shopId: this.shop.shopId as any,
        maskedPhone: '(67) 9••••-4567' as any,
        kind: 'visit',
        unit: 'stamp',
        units: 1,
        amountCents: null,
        rewardTitle: null,
        isNewCustomer: false,
        createdAt: new Date().toISOString(),
      },
    ]
  }
}

describe('merchant counter HTTP', () => {
  let app: INestApplication
  const repository = new TestCounterRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CounterController],
      providers: [
        CounterService,
        { provide: CounterRepository, useValue: repository },
        { provide: Clock, useValue: { now: () => new Date() } },
        { provide: PiiService, useValue: pii },
        { provide: ReferralSettlement, useClass: FakeReferralSettlement },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('POST /merchant/counter/visits registers a visit and returns VisitRegistered', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/counter/visits')
      .send({ phone: '67991234567' })
      .expect(201)

    expect(response.body).toMatchObject({
      entry: {
        kind: 'visit',
        maskedPhone: '(67) 9••••-4567',
        units: 1,
      },
      card: {
        unit: 'stamp',
        balance: 1,
        target: 10,
        rewardReady: false,
      },
      unitsEarned: 1,
    })
  })

  it('POST /merchant/counter/visits rejects invalid phone with validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/counter/visits')
      .send({ phone: '123' })
      .expect(400)

    expect(response.body.code).toBe('validation')
  })

  it('GET /merchant/counter/entries/today returns list of entries', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/counter/entries/today')
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({
      kind: 'visit',
      unit: 'stamp',
      units: 1,
    })
  })
})
