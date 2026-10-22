import type { CanActivate, INestApplication, Type } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { createLocalJWKSet } from 'jose'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { JWKS } from '../../auth/jwks'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { catalogShop } from '../../shops/catalog.fixtures'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard'
import { CustomerHitsController } from './hits.controller'
import { CustomerHitsRepository, type HitFeedFilter, type PublicHitRecord } from './hits.repository'
import { CustomerHitsService } from './hits.service'

const NO_CONTACT = { ctaKind: null, whatsapp: null, whatsappMessage: null, ctaUrl: null, ctaLabel: null }
const RECORD: PublicHitRecord = {
  id: '0190a000-0000-7000-8000-00000000d001',
  title: 'Bolo',
  description: null,
  priceCents: 1990,
  photoPath: 'hits/a.jpg',
  itemContact: NO_CONTACT,
  shop: catalogShop(),
}

class FakeRepository extends CustomerHitsRepository {
  filters: HitFeedFilter[] = []
  records: PublicHitRecord[] = [RECORD]
  async listFeed(filter: HitFeedFilter) {
    this.filters.push(filter)
    return this.records
  }
  async listPaidBannerItems() {
    return this.records
  }
  async listProBannerItems() {
    return []
  }
}

const NOW = new Date('2026-10-21T15:00:00Z')

async function buildApp(guard: Type<CanActivate>, repository: CustomerHitsRepository): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [CustomerHitsController],
    providers: [
      CustomerHitsService,
      { provide: CustomerHitsRepository, useValue: repository },
      { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
      { provide: JWKS, useValue: createLocalJWKSet({ keys: [] }) },
      { provide: Clock, useValue: { now: () => NOW } },
      { provide: APP_GUARD, useClass: guard },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  app.setGlobalPrefix('v1')
  await app.init()
  return app
}

describe('customer hits (HTTP)', () => {
  let app: INestApplication
  const repository = new FakeRepository()

  beforeAll(async () => {
    app = await buildApp(FakeAuthGuard, repository)
  })
  afterAll(async () => app.close())

  it('lists the feed with the effective contact, the photo url and what the item earns', async () => {
    const res = await request(app.getHttpServer()).get('/v1/hits').expect(200)
    expect(res.body).toEqual({
      items: [
        {
          id: RECORD.id,
          title: 'Bolo',
          description: null,
          priceCents: 1990,
          photoUrl: 'https://project.supabase.co/storage/v1/object/public/shop-assets/hits/a.jpg',
          earning: { unit: 'stamp', units: 1, doubled: false },
          contact: null,
          shop: { id: catalogShop().id, name: 'Barbearia do Zé', category: 'barbershop', neighborhood: 'Centro' },
        },
      ],
      nextCursor: null,
    })
  })

  it('turns a group into its categories and asks for one extra row to know about the next page', async () => {
    await request(app.getHttpServer()).get('/v1/hits?group=beauty').expect(200)
    const filter = repository.filters[repository.filters.length - 1]
    expect(filter?.categories).toContain('barbershop')
    expect(filter?.limit).toBe(21)
  })

  it('answers an empty page for a group with nothing', async () => {
    repository.records = []
    const res = await request(app.getHttpServer()).get('/v1/hits?group=pet').expect(200)
    expect(res.body).toEqual({ items: [], nextCursor: null })
    repository.records = [RECORD]
  })

  it('leaves out an item whose club is broken instead of failing the feed', async () => {
    repository.records = [RECORD, { ...RECORD, id: '0190a000-0000-7000-8000-00000000d002', shop: null }]
    const res = await request(app.getHttpServer()).get('/v1/hits').expect(200)
    expect(res.body.items).toHaveLength(1)
    repository.records = [RECORD]
  })

  it.each(['group=xyz', 'cursor=nope', 'extra=1'])('rejects the query %s with 400', async (query) => {
    await request(app.getHttpServer()).get(`/v1/hits?${query}`).expect(400)
  })

  it('lists the banners as sponsored when paid', async () => {
    const res = await request(app.getHttpServer()).get('/v1/hits/banners').expect(200)
    expect(res.body).toMatchObject([{ sponsored: true, item: { id: RECORD.id } }])
  })
})

describe('customer hits (HTTP, signed out)', () => {
  it.each(['/v1/hits', '/v1/hits/banners'])('answers 401 without a token on %s', async (path) => {
    const app = await buildApp(SupabaseAuthGuard, new FakeRepository())
    await request(app.getHttpServer()).get(path).expect(401)
    await app.close()
  })
})
