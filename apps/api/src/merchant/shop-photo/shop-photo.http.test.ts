import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { MerchantShopGuard } from '../access/merchant-shop.guard'
import { ShopPhotoController } from './shop-photo.controller'
import { ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoService } from './shop-photo.service'
import { ShopPhotoStorage } from './shop-photo.storage'

const SHOP: MerchantShopContext = { shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb002', status: 'pending', plan: 'founder', role: 'owner', termsVersion: null }
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]).toString('base64')

describe('merchant shop photo HTTP', () => {
  let app: INestApplication
  let savedPath: string | null = null

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ShopPhotoController],
      providers: [
        ShopPhotoService,
        {
          provide: ShopPhotoRepository,
          useValue: {
            findPhotoPath: async () => savedPath,
            replacePhotoPath: async (_shopId: string, path: string) => {
              const previous = savedPath
              savedPath = path
              return previous
            },
          },
        },
        { provide: ShopPhotoStorage, useValue: { upload: async () => true, remove: async () => undefined } },
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      // O guard da loja tem teste próprio; aqui ele só põe a loja no pedido, como em produção.
      .overrideGuard(MerchantShopGuard)
      .useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { merchantShop?: MerchantShopContext } } }) => {
        context.switchToHttp().getRequest().merchantShop = SHOP
        return true
      } })
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('starts without a photo', async () => {
    await request(app.getHttpServer()).get('/merchant/shop/photo').expect(200, { imageUrl: null })
  })

  it('saves a valid photo even while the shop waits for approval', async () => {
    const response = await request(app.getHttpServer()).post('/merchant/shop/photo').send({ contentType: 'image/png', dataBase64: PNG }).expect(200)
    expect(response.body.imageUrl).toMatch(new RegExp(`/storage/v1/object/public/shop-assets/${SHOP.shopId}/.+\\.png$`))
  })

  it('refuses a body outside the schema and bytes that are not the declared image', async () => {
    await request(app.getHttpServer()).post('/merchant/shop/photo').send({ contentType: 'image/svg+xml', dataBase64: PNG }).expect(400)
    const svg = Buffer.from('<svg/>').toString('base64')
    await request(app.getHttpServer()).post('/merchant/shop/photo').send({ contentType: 'image/png', dataBase64: svg }).expect(400, { code: 'invalidShopPhoto' })
  })
})
