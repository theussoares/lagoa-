import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { CounterRedemptionsController } from './counter-redemptions.controller'
import { CounterRedemptionsService } from './counter-redemptions.service'
import {
  CounterRepository,
  type ActiveRedemptionPreview,
  type SettleRedemptionError,
  type ShopWithProgram,
} from './counter.repository'
import type { CounterEntry, CounterToday } from '#shared/schemas/visit'
import { Clock } from '../../common/clock'
import { err, ok } from '#shared/types/result'
import { ShopIdSchema, VisitIdSchema } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import { MerchantShopGuard } from '../access/merchant-shop.guard'

class FakeClock {
  now(): Date {
    return new Date('2026-10-06T12:00:00.000Z')
  }
}

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

  activeRedemption: ActiveRedemptionPreview | null = {
    redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555',
    rewardTitle: 'Café grátis',
    maskedPhone: '(67) 9••••-0001',
    expiresAt: new Date('2026-10-06T12:10:00.000Z'),
  }

  lookupError: 'redemptionInvalid' | 'redemptionExpired' | null = null
  settleError: SettleRedemptionError['code'] | null = null

  async findShopAndProgramByOwner(): Promise<ShopWithProgram | null> {
    return this.shop
  }



  async listTodayEntries(): Promise<CounterToday> {
    return { entries: [], truncated: false }
  }

  async findRedemption(): Promise<any> {
    if (this.lookupError) return err({ code: this.lookupError })
    if (!this.activeRedemption) return err({ code: 'redemptionInvalid' })
    return ok(this.activeRedemption)
  }

  async settleRedemption(
    shop: ShopWithProgram,
    _redemptionId: string,
    _merchantUserId: string,
    now: Date,
  ): Promise<any> {
    if (this.settleError) return err({ code: this.settleError })
    const entry: CounterEntry = {
      id: VisitIdSchema.parse('018f98a2-7b2a-7182-9f33-6d004bbbb666'),
      shopId: ShopIdSchema.parse(shop.shopId),
      maskedPhone: MaskedPhoneSchema.parse('(67) 9••••-0001'),
      kind: 'redemption',
      unit: shop.unit,
      units: 0,
      amountCents: null,
      rewardTitle: shop.rewardTitle,
      isNewCustomer: false,
      createdAt: now.toISOString(),
    }
    return ok(entry)
  }
}

describe('CounterRedemptions HTTP', () => {
  let app: INestApplication
  let repo: TestCounterRepository

  beforeAll(async () => {
    repo = new TestCounterRepository()
    const moduleRef = await Test.createTestingModule({
      controllers: [CounterRedemptionsController],
      providers: [
        CounterRedemptionsService,
        { provide: CounterRepository, useValue: repo },
        { provide: Clock, useClass: FakeClock },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      // O guard da loja tem teste próprio (access/merchant-shop.guard.http.test.ts); aqui a loja vem do repositório de teste.
      .overrideGuard(MerchantShopGuard)
      .useValue({ canActivate: () => true })
      .compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('v1')
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('POST /v1/merchant/counter/redemptions/validate returns 200 with preview', async () => {
    repo.lookupError = null
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/validate')
      .send({ code: 'ACDEFG' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555',
      rewardTitle: 'Café grátis',
      maskedPhone: '(67) 9••••-0001',
      expiresAt: '2026-10-06T12:10:00.000Z',
    })
  })

  it('POST /v1/merchant/counter/redemptions/validate returns 404 when invalid', async () => {
    repo.lookupError = 'redemptionInvalid'
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/validate')
      .send({ code: 'XXXXXX' })

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ code: 'redemptionInvalid' })
  })

  it('POST /v1/merchant/counter/redemptions/validate returns 410 when expired', async () => {
    repo.lookupError = 'redemptionExpired'
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/validate')
      .send({ code: 'ACDEFG' })

    expect(res.status).toBe(410)
    expect(res.body).toEqual({ code: 'redemptionExpired' })
  })

  it('POST /v1/merchant/counter/redemptions/confirm returns 200 with CounterEntry', async () => {
    repo.settleError = null
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/confirm')
      .send({ redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      kind: 'redemption',
      units: 0,
      rewardTitle: 'Café grátis',
      maskedPhone: '(67) 9••••-0001',
    })
  })

  it('POST /v1/merchant/counter/redemptions/:id/confirm returns 200 with CounterEntry', async () => {
    repo.settleError = null
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/018f98a2-7b2a-7182-9f33-6d004bbbb555/confirm')
      .send({})

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      kind: 'redemption',
      units: 0,
      rewardTitle: 'Café grátis',
      maskedPhone: '(67) 9••••-0001',
    })
  })

  it('POST /v1/merchant/counter/redemptions/confirm returns 409 when already used', async () => {
    repo.settleError = 'redemptionAlreadyUsed'
    const res = await request(app.getHttpServer())
      .post('/v1/merchant/counter/redemptions/confirm')
      .send({ redemptionId: '018f98a2-7b2a-7182-9f33-6d004bbbb555' })

    expect(res.status).toBe(409)
    expect(res.body).toEqual({ code: 'redemptionAlreadyUsed' })
  })
})
