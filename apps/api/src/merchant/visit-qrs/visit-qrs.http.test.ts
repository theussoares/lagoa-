import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ProgramRules } from '#shared/schemas/program'
import type { VisitQr, VisitQrCancelReason } from '#shared/schemas/visitQr'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import { VisitQrsController } from './visit-qrs.controller'
import { FakeVisitQrsRepository } from './visit-qrs.fakes'
import { VisitQrsRepository } from './visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'
import { VisitQrsService } from './visit-qrs.service'
import { MerchantShopGuard } from '../access/merchant-shop.guard'
import { ENV } from '../../config/config.module'

class FakeClock extends Clock {
  currentTime = new Date('2026-10-07T14:00:00Z')

  now(): Date {
    return this.currentTime
  }
}

class FakeSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = null

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

describe('merchant visit-qrs HTTP', () => {
  let app: INestApplication
  const clock = new FakeClock()
  const sessionRepo = new FakeSessionRepository()
  const visitQrsRepo = new FakeVisitQrsRepository()
  // A "transação" trava a loja que o teste configurou na sessão.
  visitQrsRepo.shopStatus = () => sessionRepo.shop?.status ?? 'approved'

  const shopId = '018f98a2-7b2a-7182-9f33-6d004bbbb001'

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [VisitQrsController],
      providers: [
        { provide: ENV, useValue: { MERCHANT_TERMS_REQUIRED: '0' } },
        VisitQrsService,
        VisitQrsRules,
        { provide: VisitQrsRepository, useValue: visitQrsRepo },
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: Clock, useValue: clock },
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
    clock.currentTime = new Date('2026-10-07T14:00:00Z')
    sessionRepo.shop = {
      id: shopId,
      ownerUserId: TEST_USER.id,
      name: 'Padaria Central',
      status: 'approved',
    }
    visitQrsRepo.activeProgram = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
      rules: { mode: 'stamps', target: 10 },
    }
    visitQrsRepo.qrs.clear()
  })

  it('POST /merchant/visit-qrs: issues a stamp QR successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({})
      .expect(201)

    expect(response.body).toMatchObject({
      status: 'active',
      earn: { kind: 'visit' },
      claim: null,
      refusal: null,
    })
    expect(response.body.token).toBeDefined()
    expect(response.body.visitCode).toHaveLength(5)
  })

  it('POST /merchant/visit-qrs: returns 400 amountNotAccepted when amount is sent for stamps', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({ amountCents: 5000 })
      .expect(422)

    expect(response.body).toEqual({ code: 'amountNotAccepted' })
  })

  it('POST /merchant/visit-qrs: returns 400 invalidAmount when missing amount on pointsPerCurrency', async () => {
    visitQrsRepo.activeProgram = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
      rules: { mode: 'pointsPerCurrency', pointsPerReal: 1, target: 100 },
    }

    const response = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({})
      .expect(400)

    expect(response.body).toEqual({ code: 'invalidAmount' })
  })

  it('POST /merchant/visit-qrs: returns 403 shopPendingApproval when shop is not approved', async () => {
    sessionRepo.shop = { ...sessionRepo.shop!, status: 'pending' }

    const response = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({})
      .expect(403)

    expect(response.body).toEqual({ code: 'shopPendingApproval' })
  })

  it('GET /merchant/visit-qrs/:id: gets visit QR by id', async () => {
    const issueRes = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({})
      .expect(201)

    const qrId = issueRes.body.id

    const getRes = await request(app.getHttpServer())
      .get(`/merchant/visit-qrs/${qrId}`)
      .expect(200)

    expect(getRes.body.id).toBe(qrId)
    expect(getRes.body.status).toBe('active')
    expect(getRes.body.token).toBeUndefined()
  })

  it('GET /merchant/visit-qrs/:id: returns 404 notFound when QR does not exist', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/visit-qrs/018f98a2-7b2a-7182-9f33-6d004bbbb999')
      .expect(404)

    expect(response.body).toEqual({ code: 'notFound', entity: 'visitQr' })
  })

  it('POST /merchant/visit-qrs/:id/cancel: cancels active QR', async () => {
    const issueRes = await request(app.getHttpServer())
      .post('/merchant/visit-qrs')
      .send({})
      .expect(201)

    const qrId = issueRes.body.id

    const cancelRes = await request(app.getHttpServer())
      .post(`/merchant/visit-qrs/${qrId}/cancel`)
      .expect(201)

    expect(cancelRes.body.id).toBe(qrId)
    expect(cancelRes.body.status).toBe('cancelled')
  })
})
