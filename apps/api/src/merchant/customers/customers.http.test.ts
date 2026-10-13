import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { PiiService } from '../../common/pii.service'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import type { MerchantShopRecord } from '../session/session.repository'
import { SessionRepository } from '../session/session.repository'
import { CustomersController } from './customers.controller'
import { CustomersRepository } from './customers.repository'
import { FakeCustomersRepository, rawCustomer } from './customers.fixtures'
import { CustomersService } from './customers.service'
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

describe('merchant customers HTTP', () => {
  let app: INestApplication
  let sessionRepo: TestSessionRepository
  let customersRepo: FakeCustomersRepository
  let pii: PiiService

  beforeAll(async () => {
    pii = createTestPii()
    sessionRepo = new TestSessionRepository()
    customersRepo = new FakeCustomersRepository()

    const moduleRef = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [
        CustomersService,
        { provide: SessionRepository, useValue: sessionRepo },
        { provide: CustomersRepository, useValue: customersRepo },
        { provide: PiiService, useValue: pii },
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
    customersRepo.rows = [rawCustomer(pii, 1), rawCustomer(pii, 2)]
    customersRepo.counts = { total: 2, acceptingNotifications: 1 }
    customersRepo.pageQueries = []
  })

  it('GET /merchant/customers answers the first page with masked phones and the counts', async () => {
    const response = await request(app.getHttpServer()).get('/merchant/customers').expect(200)

    expect(response.body).toMatchObject({ nextCursor: null, total: 2, acceptingNotifications: 1 })
    expect(response.body.items.map((row: { maskedPhone: string }) => row.maskedPhone)).toEqual(['(67) 9••••-0001', '(67) 9••••-0002'])
    expect(JSON.stringify(response.body)).not.toContain('67999990001')
    expect(customersRepo.pageQueries[0]).toMatchObject({ filter: 'all', after: null })
  })

  it('GET /merchant/customers?filter=lapsed&cursor=<id> passes filter and cursor through', async () => {
    const cursor = '018f98a2-7b2a-7182-9f33-6d004bbbb001'
    await request(app.getHttpServer()).get(`/merchant/customers?filter=lapsed&cursor=${cursor}`).expect(200)
    expect(customersRepo.pageQueries[0]).toMatchObject({ filter: 'lapsed', after: cursor })
  })

  it.each(['filter=invalid', 'cursor=not-a-uuid', "cursor=1'%20or%201=1"])('GET /merchant/customers?%s answers 400 without querying', async (search) => {
    await request(app.getHttpServer()).get(`/merchant/customers?${search}`).expect(400)
    expect(customersRepo.pageQueries).toEqual([])
  })

  it('GET /merchant/customers returns 404 when shop not found', async () => {
    sessionRepo.shop = null
    const response = await request(app.getHttpServer())
      .get('/merchant/customers')
      .expect(404)

    expect(response.body).toEqual({ code: 'notFound', entity: 'merchant' })
  })
})
