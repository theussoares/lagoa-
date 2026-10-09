import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { SessionController } from './session.controller'
import { type MerchantShopRecord, SessionRepository } from './session.repository'
import { SessionService } from './session.service'

class TestSessionRepository extends SessionRepository {
  shop: MerchantShopRecord | null = null

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    return this.shop?.ownerUserId === userId ? this.shop : null
  }
}

describe('merchant session HTTP', () => {
  let app: INestApplication
  const repository = new TestSessionRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        SessionService,
        { provide: SessionRepository, useValue: repository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    repository.shop = null
  })

  it('responds with 404 notFound when user has no shop', async () => {
    const response = await request(app.getHttpServer()).get('/merchant/session').expect(404)
    expect(response.body).toEqual({ code: 'notFound', entity: 'merchant' })
  })

  it('responds with 200 MerchantSession when user owns a shop', async () => {
    repository.shop = {
      id: '018f98a2-7b2a-7182-9f33-6d004bbbb001',
      ownerUserId: TEST_USER.id,
      name: 'Padaria Central',
      status: 'approved',
    }

    const response = await request(app.getHttpServer()).get('/merchant/session').expect(200)
    expect(response.body).toEqual({
      role: 'merchant',
      merchantId: TEST_USER.id,
      shopId: repository.shop.id,
      shopName: 'Padaria Central',
      shopStatus: 'approved',
    })
  })
})
