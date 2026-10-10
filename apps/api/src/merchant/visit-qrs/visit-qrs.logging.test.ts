import { Logger, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { MerchantShopGuard } from '../access/merchant-shop.guard'
import { SessionRepository, type MerchantShopRecord } from '../session/session.repository'
import { VisitQrsController } from './visit-qrs.controller'
import { FakeVisitQrsRepository } from './visit-qrs.fakes'
import { VisitQrsRepository } from './visit-qrs.repository'
import { VisitQrsRules } from './visit-qrs.rules'
import { VisitQrsService } from './visit-qrs.service'

const SHOP: MerchantShopRecord = { id: '018f98a2-7b2a-7182-9f33-6d004bbbb002', ownerUserId: TEST_USER.id, name: 'Padaria', status: 'approved' }
const PHONE = '67991230374'

/** O que um driver de banco poderia pôr na mensagem de erro: o hash do token, o código curto, celular e e-mail. */
const leaky = (secret: string) => `driver says: key (visit_code)=(${secret}) phone=${PHONE} email=${TEST_USER.email}`

/** CA-19/25: emitir, consultar, cancelar e falhar não escrevem token, código curto, celular nem e-mail em log. */
describe('the merchant visit QR routes leave no credential or personal data in the logs', () => {
  let app: INestApplication
  const repository = new FakeVisitQrsRepository()
  const logged: string[] = []

  beforeAll(async () => {
    repository.activeProgram = { id: '018f98a2-7b2a-7182-9f33-6d004bbbb003', rules: { mode: 'stamps', target: 10 } }
    const moduleRef = await Test.createTestingModule({
      controllers: [VisitQrsController],
      providers: [
        VisitQrsService,
        VisitQrsRules,
        { provide: VisitQrsRepository, useValue: repository },
        { provide: SessionRepository, useValue: { findByOwnerUserId: async () => SHOP } },
        { provide: Clock, useValue: { now: () => new Date('2026-10-09T12:00:00Z') } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      .overrideGuard(MerchantShopGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    logged.length = 0
    repository.issueFails = null
    repository.qrs.clear()
    for (const level of ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message))
      })
    }
  })

  afterEach(() => vi.restoreAllMocks())

  const expectNothingSensitiveLogged = (...secrets: string[]) => {
    const everything = logged.join('\n')
    for (const secret of [...secrets, PHONE, TEST_USER.email ?? '']) expect(everything).not.toContain(secret)
  }

  it('after issuing, reading and cancelling', async () => {
    const issued = await request(app.getHttpServer()).post('/merchant/visit-qrs').send({}).expect(201)
    const { id, token, visitCode } = issued.body as { id: string; token: string; visitCode: string }
    await request(app.getHttpServer()).get(`/merchant/visit-qrs/${id}`).expect(200)
    await request(app.getHttpServer()).post(`/merchant/visit-qrs/${id}/cancel`).expect(201)
    expectNothingSensitiveLogged(token, visitCode)
  })

  it('after a refusal by the live QR limit', async () => {
    repository.activeCount = 99
    await request(app.getHttpServer()).post('/merchant/visit-qrs').send({}).expect(409)
    repository.activeCount = 0
    expectNothingSensitiveLogged()
  })

  it('after an unexpected error, which answers 500 internal and logs only its type', async () => {
    repository.issueFails = new Error(leaky('K7M4P'))
    const response = await request(app.getHttpServer()).post('/merchant/visit-qrs').send({}).expect(500)
    expect(response.body).toEqual({ code: 'internal' })
    expect(logged.every((line) => line.startsWith('Unhandled Error'))).toBe(true)
    expectNothingSensitiveLogged('K7M4P')
  })
})
