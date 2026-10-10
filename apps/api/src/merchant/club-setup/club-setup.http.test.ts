import type { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopStatus } from '#shared/schemas/shop'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import type { NewAppUser } from '../../accounts/app-user.writer'
import type { AuthenticatedRequest, AuthUser } from '../../auth/auth.types'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import { ClubSetupController } from './club-setup.controller'
import { ShopController } from './shop.controller'
import {
  type CreateClubOutcome,
  type PosterData,
  ClubSetupRepository,
} from './club-setup.repository'
import { ClubSetupService } from './club-setup.service'
import { MerchantShopGuard } from '../access/merchant-shop.guard'

const sampleDraft: ClubSetupDraft = {
  shop: {
    name: 'Barbearia Retrô',
    category: 'barbershop',
    neighborhood: 'Santos Dumont',
    addressLine: 'Av. Brasil, 45',
  },
  program: {
    reward: { title: 'Barba de cortesia' },
    rules: { mode: 'stamps', target: 8 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: true, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 4 },
  },
}

const OWNER: AuthUser = { ...TEST_USER, phone: '67991230374' as PhoneNumber }

/** Troca o JWT por um lojista que entrou por SMS (o Criar o clube exige o celular do token). */
class OwnerAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<AuthenticatedRequest>().user = OWNER
    return true
  }
}

class TestClubSetupRepository extends ClubSetupRepository {
  shop: { id: string; status: ShopStatus; name: string } | null = null
  poster: PosterData | null = null
  phoneTaken = false
  posterReprinted = false

  async createClub(_owner: NewAppUser, draft: ClubSetupDraft, newCheckInCode: () => string): Promise<CreateClubOutcome> {
    if (this.phoneTaken) return { kind: 'phoneTaken' }
    if (this.shop) return { kind: 'existing', club: { shopId: this.shop.id, shopName: this.shop.name, shopStatus: this.shop.status } }
    this.shop = { id: '018f98a2-7b2a-7182-9f33-6d004bbbb111', status: 'pending', name: draft.shop.name }
    this.poster = { shopName: draft.shop.name, status: 'pending', checkInCode: newCheckInCode(), rewardTitle: draft.program.reward.title, unit: 'stamp', target: 8 }
    return { kind: 'created', club: { shopId: this.shop.id, shopName: this.shop.name, shopStatus: 'pending' } }
  }

  async getPoster(): Promise<PosterData | null> {
    return this.poster
  }

  async getStatus(): Promise<ShopStatus | null> {
    return this.shop?.status ?? null
  }

  async approveShop(): Promise<ShopStatus | null> {
    if (!this.shop) return null
    this.shop.status = 'approved'
    if (this.poster) this.poster = { ...this.poster, status: 'approved' }
    return 'approved'
  }

  async isPosterReprintPending(): Promise<boolean | null> {
    return this.shop ? !this.posterReprinted : null
  }

  async markPosterReprinted(): Promise<boolean | null> {
    if (!this.shop) return null
    this.posterReprinted = true
    return false
  }
}

describe('merchant club-setup HTTP', () => {
  let app: INestApplication
  const repository = new TestClubSetupRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ClubSetupController, ShopController],
      providers: [
        ClubSetupService,
        { provide: PiiService, useValue: createTestPii() },
        { provide: Clock, useValue: { now: () => new Date('2026-10-09T12:00:00Z') } },
        { provide: ClubSetupRepository, useValue: repository },
        { provide: APP_GUARD, useClass: OwnerAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    })
      // O guard da loja tem teste próprio (access/merchant-shop.guard.http.test.ts); aqui a loja vem do repositório de teste.
      .overrideGuard(MerchantShopGuard)
      .useValue({ canActivate: () => true })
      .compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    repository.shop = null
    repository.poster = null
    repository.phoneTaken = false
    repository.posterReprinted = false
  })

  it('POST /merchant/club-setup creates shop and program, returning MerchantSession', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/club-setup')
      .send(sampleDraft)
      .expect(201)

    expect(response.body).toEqual({
      role: 'merchant',
      merchantId: TEST_USER.id,
      shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb111',
      shopName: 'Barbearia Retrô',
      shopStatus: 'pending',
    })
  })

  it('POST /merchant/club-setup twice answers 200 with the same shop and ignores the new draft', async () => {
    await request(app.getHttpServer()).post('/merchant/club-setup').send(sampleDraft).expect(201)
    const again = await request(app.getHttpServer())
      .post('/merchant/club-setup')
      .send({ ...sampleDraft, shop: { ...sampleDraft.shop, name: 'Outro nome' } })
      .expect(200)
    expect(again.body).toMatchObject({ shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb111', shopName: 'Barbearia Retrô' })
  })

  it('POST /merchant/club-setup with a phone of another account answers 409 phoneAlreadyUsed', async () => {
    repository.phoneTaken = true
    const response = await request(app.getHttpServer()).post('/merchant/club-setup').send(sampleDraft).expect(409)
    expect(response.body).toEqual({ code: 'phoneAlreadyUsed' })
  })

  it('poster reprint: pending until the merchant prints, then done', async () => {
    await request(app.getHttpServer()).post('/merchant/club-setup').send(sampleDraft).expect(201)
    expect((await request(app.getHttpServer()).get('/merchant/shop/poster-reprint').expect(200)).body).toEqual({ pending: true })
    expect((await request(app.getHttpServer()).post('/merchant/shop/poster-reprint/printed').expect(200)).body).toEqual({ pending: false })
    expect((await request(app.getHttpServer()).get('/merchant/shop/poster-reprint').expect(200)).body).toEqual({ pending: false })
  })

  it('GET /merchant/poster returns poster for the created shop', async () => {
    await request(app.getHttpServer()).post('/merchant/club-setup').send(sampleDraft).expect(201)

    const response = await request(app.getHttpServer()).get('/merchant/poster').expect(200)

    expect(response.body).toMatchObject({
      shopName: 'Barbearia Retrô',
      status: 'pending',
      rewardTitle: 'Barba de cortesia',
      unit: 'stamp',
      target: 8,
    })
    expect(response.body.checkInCode).toHaveLength(6)
  })

  it('GET /merchant/shop/status returns status and POST test-approve promotes to approved', async () => {
    await request(app.getHttpServer()).post('/merchant/club-setup').send(sampleDraft).expect(201)

    const status1 = await request(app.getHttpServer()).get('/merchant/shop/status').expect(200)
    expect(status1.body).toEqual({ status: 'pending' })

    vi.stubEnv('ENABLE_TEST_APPROVE', '1')
    const approve = await request(app.getHttpServer()).post('/merchant/shop/test-approve').expect(201)
    vi.unstubAllEnvs()
    expect(approve.body).toEqual({ status: 'approved' })

    const status2 = await request(app.getHttpServer()).get('/merchant/shop/status').expect(200)
    expect(status2.body).toEqual({ status: 'approved' })
  })

  it('POST /merchant/club-setup rejects invalid draft with validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/merchant/club-setup')
      .send({ shop: { name: '' } })
      .expect(400)

    expect(response.body.code).toBe('validation')
  })
})
