import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { WALLET_ACTIVITY_DEFAULT_LIMIT, WALLET_ACTIVITY_MAX_LIMIT } from '#shared/constants/domain'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { ENV } from '../../config/config.module'
import { catalogShop } from '../../shops/catalog.fixtures'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { activityRecord, walletCardRecord } from './wallet.fixtures'
import { WalletController } from './wallet.controller'
import { type ActivityKind, type ActivityRecord, type WalletCardRecord, WalletRepository } from './wallet.repository'
import { WalletService } from './wallet.service'

const SHOP_A = '0190a000-0000-7000-8000-0000000000a1'
const SHOP_B = '0190a000-0000-7000-8000-0000000000a2'

class FakeWalletRepository extends WalletRepository {
  cards: WalletCardRecord[] = []
  activity: ActivityRecord[] = []
  readonly calls: { customerId: string; kinds?: readonly ActivityKind[]; limit?: number }[] = []
  async listCards(customerId: string): Promise<WalletCardRecord[]> {
    this.calls.push({ customerId })
    return this.cards
  }
  async findCard(customerId: string, shopId: string): Promise<WalletCardRecord | null> {
    this.calls.push({ customerId })
    return this.cards.find((card) => card.shop.id === shopId) ?? null
  }
  async listActivity(customerId: string, kinds: readonly ActivityKind[], limit: number): Promise<ActivityRecord[]> {
    this.calls.push({ customerId, kinds, limit })
    return this.activity
  }
}

describe('wallet HTTP', () => {
  let app: INestApplication
  const repository = new FakeWalletRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        WalletService,
        { provide: WalletRepository, useValue: repository },
        { provide: ENV, useValue: { SUPABASE_URL: 'https://project.supabase.co' } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    repository.cards = []
    repository.activity = []
    repository.calls.length = 0
  })

  it('lists the cards closest to the reward first, always for the token user', async () => {
    const far = walletCardRecord({ cardId: 'far', balance: 1, shop: catalogShop({ id: SHOP_A }) })
    const ready = walletCardRecord({ cardId: 'ready', balance: 10, shop: catalogShop({ id: SHOP_B, name: 'Café' }) })
    repository.cards = [far, ready]
    const response = await request(app.getHttpServer()).get('/wallet/cards').expect(200)
    expect(response.body.map((card: { id: string }) => card.id)).toEqual(['ready', 'far'])
    expect(repository.calls[0]?.customerId).toBe(TEST_USER.id)
  })

  it('returns one card by shop', async () => {
    repository.cards = [walletCardRecord({ shop: catalogShop({ id: SHOP_A }) })]
    const response = await request(app.getHttpServer()).get(`/wallet/cards/${SHOP_A}`).expect(200)
    expect(response.body.shopId).toBe(SHOP_A)
  })

  it('answers 404 notFound (card) when the customer has no card in that shop', async () => {
    const response = await request(app.getHttpServer()).get(`/wallet/cards/${SHOP_B}`).expect(404)
    expect(response.body).toEqual({ code: 'notFound', entity: 'card' })
  })

  it('rejects a shop id that is not a uuid before touching the database', async () => {
    await request(app.getHttpServer()).get('/wallet/cards/not-a-uuid').expect(400)
    expect(repository.calls).toHaveLength(0)
  })

  it('reads the activity with the default limit and only earning and redemption kinds', async () => {
    repository.activity = [activityRecord()]
    const response = await request(app.getHttpServer()).get('/wallet/activity').expect(200)
    expect(response.body).toHaveLength(1)
    expect(repository.calls[0]).toMatchObject({ limit: WALLET_ACTIVITY_DEFAULT_LIMIT, kinds: ['visit', 'amount', 'checkIn', 'redemption'] })
  })

  it('reads the reward history as redemptions only', async () => {
    await request(app.getHttpServer()).get('/wallet/rewards?limit=20').expect(200)
    expect(repository.calls[0]).toMatchObject({ limit: 20, kinds: ['redemption'] })
  })

  it.each(['0', '-1', 'abc', String(WALLET_ACTIVITY_MAX_LIMIT + 1), '1.5'])('rejects limit=%s', async (limit) => {
    await request(app.getHttpServer()).get(`/wallet/activity?limit=${limit}`).expect(400)
  })
})
