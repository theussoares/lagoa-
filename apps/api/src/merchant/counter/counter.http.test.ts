import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { CounterController } from './counter.controller'
import {
  CounterRepository,
  type ShopWithProgram,
} from './counter.repository'
import { CounterService } from './counter.service'
import type { CounterEntry } from '#shared/schemas/visit'
import { Clock } from '../../common/clock'

class TestCounterRepository extends CounterRepository {
  shop: ShopWithProgram | null = {
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

  async findShopAndProgramByOwner(_ownerUserId: string): Promise<ShopWithProgram | null> {
    return this.shop
  }

  async listTodayEntries(): Promise<CounterEntry[]> {
    return [
      {
        id: '018f98a2-7b2a-7182-9f33-6d004bbbb333' as any,
        shopId: this.shop?.shopId as any,
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

  async findActiveRedemption(): Promise<any> {
    throw new Error('Not implemented')
  }

  async settleRedemption(): Promise<any> {
    throw new Error('Not implemented')
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
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

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

  it('GET /merchant/counter/entries/today returns 404 when shop not found', async () => {
    repository.shop = null
    const response = await request(app.getHttpServer())
      .get('/merchant/counter/entries/today')
      .expect(404)

    expect(response.body).toEqual({ code: 'notFound', entity: 'merchant' })
  })
})
