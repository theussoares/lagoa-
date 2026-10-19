import { type ExecutionContext, type INestApplication, UnauthorizedException } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import type { AuthenticatedRequest } from '../../auth/auth.types'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { MerchantShopGuard } from '../access/merchant-shop.guard'
import { pngHeader } from '../shop-photo/image-fixtures'
import { ShopPhotoStorage } from '../shop-photo/shop-photo.storage'
import { HitsController } from './hits.controller'
import { type HitItemRow, HitsRepository } from './hits.repository'
import { HitsService } from './hits.service'

/** O guard real tem teste próprio; aqui só importa que sem token a rota não responde. */
class TokenRequiredGuard extends FakeAuthGuard {
  override canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { headers: Record<string, string | undefined> }>()
    if (request.headers.authorization === undefined) throw new UnauthorizedException()
    request.user = TEST_USER
    return true
  }
}

const SHOP: MerchantShopContext = { shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb002', status: 'approved', plan: 'founder', role: 'owner', termsVersion: null }
const ID = '018f98a2-7b2a-7182-9f33-6d004bbbb099'
const DRAFT = { title: 'Bolo', description: null, priceCents: 1000, contact: null, endsAt: null }
const NOW = new Date('2026-01-01T00:00:00Z')

const ROW: HitItemRow = {
  id: ID,
  shopId: SHOP.shopId,
  title: 'Bolo',
  description: null,
  priceCents: 1000,
  photoPath: null,
  ctaKind: null,
  whatsapp: null,
  whatsappMessage: null,
  ctaUrl: null,
  ctaLabel: null,
  status: 'pending',
  rejectionReason: null,
  endsAt: null,
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
}

describe('merchant hits HTTP', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HitsController],
      providers: [
        HitsService,
        {
          provide: HitsRepository,
          useValue: {
            listForShop: async () => [ROW],
            insert: async () => ({ ok: true, value: ROW }),
            findForShop: async () => ROW,
            updateLocked: async () => ({ ok: true, value: ROW }),
          },
        },
        { provide: ShopPhotoStorage, useValue: { upload: async () => true, remove: async () => undefined } },
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: APP_GUARD, useClass: TokenRequiredGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
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

  const server = () => request(app.getHttpServer())
  const auth = { Authorization: 'Bearer test' }

  it('refuses a call without a token', async () => {
    await server().get('/merchant/hits').expect(401)
    await server().post('/merchant/hits').send(DRAFT).expect(401)
  })

  it('lists with the cap and creates', async () => {
    const list = await server().get('/merchant/hits').set(auth).expect(200)
    expect(list.body).toMatchObject({ cap: 5, items: [{ id: ID, status: 'pending' }] })
    await server().post('/merchant/hits').set(auth).send(DRAFT).expect(201)
  })

  it('refuses a body with a field outside the draft, such as shopId', async () => {
    await server().post('/merchant/hits').set(auth).send({ ...DRAFT, shopId: ID }).expect(400)
    await server().patch(`/merchant/hits/${ID}`).set(auth).send({ ...DRAFT, status: 'approved' }).expect(400)
  })

  it('refuses an id that is not a uuid with 400, never 500', async () => {
    await server().patch('/merchant/hits/not-an-id').set(auth).send(DRAFT).expect(400)
    await server().post('/merchant/hits/not-an-id/archive').set(auth).expect(400)
    await server().post('/merchant/hits/not-an-id/unarchive').set(auth).expect(400)
    await server().put('/merchant/hits/not-an-id/photo').set(auth).send({ contentType: 'image/png', dataBase64: '' }).expect(400)
  })

  it('archives, unarchives and saves a photo', async () => {
    await server().post(`/merchant/hits/${ID}/archive`).set(auth).expect(200)
    await server().post(`/merchant/hits/${ID}/unarchive`).set(auth).expect(200)
    const photo = { contentType: 'image/png', dataBase64: pngHeader(800, 600).toString('base64') }
    await server().put(`/merchant/hits/${ID}/photo`).set(auth).send(photo).expect(200)
    await server().put(`/merchant/hits/${ID}/photo`).set(auth).send({ ...photo, dataBase64: Buffer.from('<svg/>').toString('base64') }).expect(400, { code: 'invalidShopPhoto' })
  })
})
