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
import { CustomersRepository, type RawCustomerCardRow } from './customers.repository'
import { CustomersService } from './customers.service'

class TestSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb002',
    ownerUserId: TEST_USER.id,
    name: 'Padaria Central',
    status: 'approved',
  }

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

class TestCustomersRepository extends CustomersRepository {
  rows: RawCustomerCardRow[] = []

  async listShopCustomers(_shopId: string): Promise<RawCustomerCardRow[]> {
    return this.rows
  }
}

describe('merchant customers HTTP', () => {
  let app: INestApplication
  let sessionRepo: TestSessionRepository
  let customersRepo: TestCustomersRepository
  let pii: PiiService

  beforeAll(async () => {
    pii = createTestPii()
    sessionRepo = new TestSessionRepository()
    customersRepo = new TestCustomersRepository()

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
    }).compile()

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
    }
    customersRepo.rows = [
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb011',
        phoneEncrypted: pii.encrypt('67999990001'),
        firstName: 'Lapsed Customer',
        unit: 'stamp',
        balance: 2,
        target: 10,
        visitsCount: 1,
        lastVisitAt: new Date('2026-09-01T10:00:00Z'),
        acceptsNotifications: true,
      },
      {
        customerId: '018f98a2-7b2a-7182-9f33-6d004bbbb012',
        phoneEncrypted: pii.encrypt('67999990002'),
        firstName: 'Reward Ready Customer',
        unit: 'stamp',
        balance: 10,
        target: 10,
        visitsCount: 10,
        lastVisitAt: new Date('2026-10-07T10:00:00Z'),
        acceptsNotifications: false,
      },
    ]
  })

  it('GET /merchant/customers default returns all customers with masked phone', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/customers')
      .expect(200)

    expect(response.body).toHaveLength(2)
    expect(response.body[0].maskedPhone).toBe('(67) 9••••-0001')
    expect(response.body[1].maskedPhone).toBe('(67) 9••••-0002')
    expect(JSON.stringify(response.body)).not.toContain('67999990001')
    expect(JSON.stringify(response.body)).not.toContain('67999990002')
  })

  it('GET /merchant/customers?filter=lapsed returns only lapsed customers', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/customers?filter=lapsed')
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].firstName).toBe('Lapsed Customer')
    expect(response.body[0].isLapsed).toBe(true)
  })

  it('GET /merchant/customers?filter=rewardReady returns only reward-ready customers', async () => {
    const response = await request(app.getHttpServer())
      .get('/merchant/customers?filter=rewardReady')
      .expect(200)

    expect(response.body).toHaveLength(1)
    expect(response.body[0].firstName).toBe('Reward Ready Customer')
    expect(response.body[0].balance).toBe(10)
  })

  it('GET /merchant/customers?filter=invalid returns 400', async () => {
    await request(app.getHttpServer())
      .get('/merchant/customers?filter=invalid')
      .expect(400)
  })

  it('GET /merchant/customers returns 404 when shop not found', async () => {
    sessionRepo.shop = null
    const response = await request(app.getHttpServer())
      .get('/merchant/customers')
      .expect(404)

    expect(response.body).toEqual({ code: 'notFound', entity: 'merchant' })
  })
})
