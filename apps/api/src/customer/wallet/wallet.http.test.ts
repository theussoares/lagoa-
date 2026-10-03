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

const OTHER_CUSTOMER = '0190a000-0000-7000-8000-0000000000ff'

/** Guarda os dados por dono, como o banco: quem pergunta só enxerga o que é seu. */
class FakeWalletRepository extends WalletRepository {
  cards: Record<string, WalletCardRecord[]> = {}
  activity: Record<string, ActivityRecord[]> = {}
  readonly calls: { customerId: string; kinds?: readonly ActivityKind[]; limit?: number }[] = []
  async listCards(customerId: string): Promise<WalletCardRecord[]> {
    this.calls.push({ customerId })
    return this.cards[customerId] ?? []
  }
  async findCard(customerId: string, shopId: string): Promise<WalletCardRecord | null> {
    this.calls.push({ customerId })
    return (this.cards[customerId] ?? []).find((card) => card.shop.id === shopId) ?? null
  }
  async listActivity(customerId: string, kinds: readonly ActivityKind[], limit: number): Promise<ActivityRecord[]> {
    this.calls.push({ customerId, kinds, limit })
    return this.activity[customerId] ?? []
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
    repository.cards = {}
    repository.activity = {}
    repository.calls.length = 0
  })

  it('lists the cards closest to the reward first, always for the token user', async () => {
    const far = walletCardRecord({ cardId: 'far', balance: 1, shop: catalogShop({ id: SHOP_A }) })
    const ready = walletCardRecord({ cardId: 'ready', balance: 10, shop: catalogShop({ id: SHOP_B, name: 'Café' }) })
    repository.cards = { [TEST_USER.id]: [far, ready] }
    const response = await request(app.getHttpServer()).get('/wallet/cards').expect(200)
    expect(response.body.map((card: { id: string }) => card.id)).toEqual(['ready', 'far'])
    expect(repository.calls.map((call) => call.customerId)).toEqual([TEST_USER.id])
  })

  it('never shows a card that belongs to someone else, even by shop id', async () => {
    repository.cards = { [OTHER_CUSTOMER]: [walletCardRecord({ shop: catalogShop({ id: SHOP_A }) })] }
    await request(app.getHttpServer()).get('/wallet/cards').expect(200, [])
    await request(app.getHttpServer()).get(`/wallet/cards/${SHOP_A}`).expect(404)
    expect(repository.calls.every((call) => call.customerId === TEST_USER.id)).toBe(true)
  })

  it('skips a card that breaks the contract instead of failing the wallet', async () => {
    const broken = walletCardRecord({ cardId: 'broken', shop: catalogShop({ id: SHOP_B, name: 'x'.repeat(200) }) })
    const fine = walletCardRecord({ cardId: 'fine', shop: catalogShop({ id: SHOP_A }) })
    repository.cards = { [TEST_USER.id]: [broken, fine] }
    const response = await request(app.getHttpServer()).get('/wallet/cards').expect(200)
    expect(response.body.map((card: { id: string }) => card.id)).toEqual(['fine'])
  })

  it('returns one card by shop', async () => {
    repository.cards = { [TEST_USER.id]: [walletCardRecord({ shop: catalogShop({ id: SHOP_A }) })] }
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
    repository.activity = { [TEST_USER.id]: [activityRecord()], [OTHER_CUSTOMER]: [activityRecord({ id: 'foreign' })] }
    const response = await request(app.getHttpServer()).get('/wallet/activity').expect(200)
    expect(response.body).toHaveLength(1)
    expect(response.body.map((a: { id: string }) => a.id)).not.toContain('foreign')
    expect(repository.calls[0]).toMatchObject({ customerId: TEST_USER.id, limit: WALLET_ACTIVITY_DEFAULT_LIMIT, kinds: ['visit', 'amount', 'checkIn', 'redemption'] })
  })

  it('reads the reward history as redemptions only', async () => {
    await request(app.getHttpServer()).get('/wallet/rewards?limit=20').expect(200)
    expect(repository.calls[0]).toMatchObject({ customerId: TEST_USER.id, limit: 20, kinds: ['redemption'] })
  })

  it.each(['0', '-1', 'abc', String(WALLET_ACTIVITY_MAX_LIMIT + 1), '1.5'])('rejects limit=%s', async (limit) => {
    await request(app.getHttpServer()).get(`/wallet/activity?limit=${limit}`).expect(400)
  })
})
