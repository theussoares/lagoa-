import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DISCOVER_SHOPS_LIMIT } from '#shared/constants/domain'
import { ENV } from '../../config/config.module'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { discoverShop } from './discover.fixtures'
import { DiscoverController } from './discover.controller'
import { type DiscoverShop, DiscoverRepository } from './discover.repository'
import { DiscoverService } from './discover.service'

class RecordingDiscoverRepository extends DiscoverRepository {
  lastLimit: number | null = null
  constructor(private readonly shops: DiscoverShop[]) {
    super()
  }
  async listApprovedShops(limit: number): Promise<DiscoverShop[]> {
    this.lastLimit = limit
    return this.shops
  }
}

describe('discover HTTP', () => {
  let app: INestApplication
  const repository = new RecordingDiscoverRepository([discoverShop()])

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

  it('answers an empty list of challenges (out of the MVP)', async () => {
    const response = await request(app.getHttpServer()).get('/discover/challenges').expect(200)
    expect(response.body).toEqual([])
  })
})
