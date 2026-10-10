import { Controller, Get, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { CurrentShop } from './current-shop.decorator'
import type { MerchantShopContext } from './merchant-shop.context'
import { MerchantShopGuard } from './merchant-shop.guard'
import { MerchantShopResolver } from './merchant-shop.resolver'
import { MerchantSurface } from './merchant-surface.decorator'

const OTHER_SHOP: MerchantShopContext = { shopId: 'shop-of-someone-else', status: 'approved', plan: 'founderPro', role: 'owner', termsVersion: null }
const MY_SHOP: MerchantShopContext = { shopId: 'my-shop', status: 'pending', plan: 'founder', role: 'owner', termsVersion: 'v1' }

class FakeResolver extends MerchantShopResolver {
  shops = new Map<string, MerchantShopContext>()
  async resolveForUser(userId: string): Promise<MerchantShopContext | null> {
    return this.shops.get(userId) ?? null
  }
}

@MerchantSurface()
@Controller('t/with-shop')
class WithShopController {
  @Get()
  whoami(@CurrentShop() shop: MerchantShopContext): MerchantShopContext {
    return shop
  }
}

@MerchantSurface({ shopRequired: false })
@Controller('t/maybe-shop')
class MaybeShopController {
  @Get()
  whoami(): { ok: true } {
    return { ok: true }
  }
}

@Controller('t/unguarded')
class UnguardedController {
  @Get()
  whoami(@CurrentShop() shop: MerchantShopContext): MerchantShopContext {
    return shop
  }
}

describe('MerchantShopGuard', () => {
  let app: INestApplication
  const resolver = new FakeResolver()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WithShopController, MaybeShopController, UnguardedController],
      providers: [
        MerchantShopGuard,
        { provide: MerchantShopResolver, useValue: resolver },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('hands the controller the shop of the signed-in user, never another one', async () => {
    resolver.shops = new Map([[TEST_USER.id, MY_SHOP], ['another-user', OTHER_SHOP]])
    const res = await request(app.getHttpServer()).get('/t/with-shop').expect(200)
    expect(res.body).toEqual(MY_SHOP)
  })

  it('answers notFound(shop) to a user without a shop', async () => {
    resolver.shops = new Map([['another-user', OTHER_SHOP]])
    const res = await request(app.getHttpServer()).get('/t/with-shop').expect(404)
    expect(res.body).toEqual({ code: 'notFound', entity: 'shop' })
  })

  it('lets session and club setup through without a shop', async () => {
    resolver.shops = new Map()
    await request(app.getHttpServer()).get('/t/maybe-shop').expect(200)
  })

  it('fails closed when a controller forgot @MerchantSurface()', async () => {
    resolver.shops = new Map([[TEST_USER.id, MY_SHOP]])
    await request(app.getHttpServer()).get('/t/unguarded').expect(500)
  })
})
