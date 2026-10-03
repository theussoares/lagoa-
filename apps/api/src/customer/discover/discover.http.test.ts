import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DISCOVER_SHOPS_LIMIT } from '#shared/constants/domain'
import { ENV } from '../../config/config.module'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { catalogShop } from '../../shops/catalog.fixtures'
import type { CatalogShop } from '../../shops/catalog-shop'
import { DiscoverController } from './discover.controller'
import { DiscoverRepository } from './discover.repository'
import { DiscoverService } from './discover.service'

class RecordingDiscoverRepository extends DiscoverRepository {
  lastLimit: number | null = null
  constructor(public shops: CatalogShop[]) {
    super()
  }
  async listApprovedShops(limit: number): Promise<CatalogShop[]> {
    this.lastLimit = limit
    return this.shops
  }
}

describe('discover HTTP', () => {
  let app: INestApplication
  const repository = new RecordingDiscoverRepository([catalogShop()])

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DiscoverController],
      providers: [
        DiscoverService,
        { provide: DiscoverRepository, useValue: repository },
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('lists the shop summaries and always asks the repository for a bounded page', async () => {
    const response = await request(app.getHttpServer()).get('/discover/shops').expect(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({ name: 'Barbearia do Zé', program: { unit: 'stamp', target: 10 } })
    expect(repository.lastLimit).toBe(DISCOVER_SHOPS_LIMIT)
  })

  it('leaves a shop out instead of failing the whole list when it breaks the contract', async () => {
    const original = repository.shops
    repository.shops = [catalogShop(), catalogShop({ id: 'bad', name: 'x'.repeat(200) })]
    const response = await request(app.getHttpServer()).get('/discover/shops').expect(200)
    expect(response.body).toHaveLength(1)
    repository.shops = original
  })

  it('answers an empty list of challenges (out of the MVP)', async () => {
    const response = await request(app.getHttpServer()).get('/discover/challenges').expect(200)
    expect(response.body).toEqual([])
  })
})
