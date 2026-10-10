import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { ProgramController } from './program.controller'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ProgramRepository, type ActiveProgramData } from './program.repository'
import { Clock } from '../../common/clock'
import { ProgramService } from './program.service'
import { MerchantShopGuard } from '../access/merchant-shop.guard'

class TestProgramRepository extends ProgramRepository {
  data: ActiveProgramData | null = null
  cardCount = 0

  async findActiveProgramByOwner(_ownerUserId: string): Promise<ActiveProgramData | null> {
    return this.data
  }

  async countCardsByShopId(_shopId: string): Promise<number> {
    return this.cardCount
  }

  async updateActiveProgram(
    _ownerUserId: string,
    draft: ProgramDraft,
    decide: (current: Program, cardsCount: number) => Result<{ isNewVersion: boolean }, ErrorOf<'programModeLocked'>>,
  ): Promise<Result<Program, ErrorOf<'notFound' | 'programModeLocked'>>> {
    if (!this.data) return err({ code: 'notFound', entity: 'program' })
    const decision = decide(this.data.program, this.cardCount)
    if (!decision.ok) return decision
    const updated: Program = {
      id: decision.value.isNewVersion ? ('018f98a2-7b2a-7182-9f33-6d004bbbb999' as any) : this.data.program.id,
      shopId: this.data.shopId as any,
      reward: draft.reward,
      rules: draft.rules,
      bonusRules: draft.bonusRules,
      expirationPolicy: draft.expirationPolicy,
      checkIn: draft.checkIn,
    }
    this.data.program = updated
    return ok(updated)
  }
}

describe('merchant program HTTP', () => {
  let app: INestApplication
  const repository = new TestProgramRepository()

  const defaultProgram: Program = {
    id: '018f98a2-7b2a-7182-9f33-6d004bbbb111' as any,
    shopId: '018f98a2-7b2a-7182-9f33-6d004bbbb222' as any,
    reward: { title: 'Café grátis' },
    rules: { mode: 'stamps', target: 10 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  const validDraft: ProgramDraft = {
    reward: { title: 'Café espresso duplo' },
    rules: { mode: 'stamps', target: 12 },
    bonusRules: {
      welcomeBonus: { enabled: true, units: 1 },
      birthdayMultiplier: { enabled: false, multiplier: 2 },
      referralBonus: { enabled: true, units: 1 },
      surpriseDay: { enabled: false, multiplier: 2, date: null },
    },
    expirationPolicy: { kind: 'never' },
    checkIn: { enabled: true, cooldownHours: 24 },
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProgramController],
      providers: [
        ProgramService,
        { provide: Clock, useValue: { now: () => new Date('2026-10-09T12:00:00Z') } },
        { provide: ProgramRepository, useValue: repository },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
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

  it('GET /merchant/program returns active Program', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }

    const response = await request(app.getHttpServer())
      .get('/merchant/program')
      .expect(200)

    expect(response.body).toEqual(defaultProgram)
  })

  it('GET /merchant/program/cards/count returns count of cards', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 27

    const response = await request(app.getHttpServer())
      .get('/merchant/program/cards/count')
      .expect(200)

    expect(response.body).toEqual({ count: 27 })
  })

  it('GET /merchant/program/active-cards returns count of cards for frontend compatibility', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 35

    const response = await request(app.getHttpServer())
      .get('/merchant/program/active-cards')
      .expect(200)

    expect(response.body).toEqual({ count: 35 })
  })

  it('PUT /merchant/program updates program and returns updated Program', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 10

    const response = await request(app.getHttpServer())
      .put('/merchant/program')
      .send(validDraft)
      .expect(200)

    expect(response.body).toMatchObject({
      reward: { title: 'Café espresso duplo' },
      rules: { mode: 'stamps', target: 12 },
    })
  })

  it('PUT /merchant/program returns 409 programModeLocked if changing mode with active cards', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 10

    const modeChangeDraft: ProgramDraft = {
      ...validDraft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    }

    const response = await request(app.getHttpServer())
      .put('/merchant/program')
      .send(modeChangeDraft)
      .expect(409)

    expect(response.body).toMatchObject({
      code: 'programModeLocked',
    })
  })

  it('PUT /merchant/program succeeds when changing mode with 0 active cards', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 0

    const modeChangeDraft: ProgramDraft = {
      ...validDraft,
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    }

    const response = await request(app.getHttpServer())
      .put('/merchant/program')
      .send(modeChangeDraft)
      .expect(200)

    expect(response.body).toMatchObject({
      rules: { mode: 'pointsPerVisit', pointsPerVisit: 10, target: 100 },
    })
  })

  it('PUT /merchant/program returns 400 when payload violates schema (welcomeBonus >= target)', async () => {
    repository.data = { shopId: defaultProgram.shopId, program: defaultProgram }
    repository.cardCount = 0

    const invalidDraft = {
      ...validDraft,
      rules: { mode: 'stamps', target: 5 },
      bonusRules: {
        ...validDraft.bonusRules,
        welcomeBonus: { enabled: true, units: 5 }, // welcome reaches target!
      },
    }

    const response = await request(app.getHttpServer())
      .put('/merchant/program')
      .send(invalidDraft)
      .expect(400)

    expect(response.body).toMatchObject({
      code: 'validation',
    })
  })

  it('GET /merchant/program returns 404 when shop has no program', async () => {
    repository.data = null

    const response = await request(app.getHttpServer())
      .get('/merchant/program')
      .expect(404)

    expect(response.body).toMatchObject({
      code: 'notFound',
    })
  })
})
