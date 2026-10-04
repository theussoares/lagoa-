import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { redemptionRecord } from './redemption.fixtures'
import { RedemptionController } from './redemption.controller'
import {
  type RedemptionRecord,
  RedemptionRepository,
  type RedemptionRequestAttempt,
  type RedemptionRequestState,
  type RequestDecision,
} from './redemption.repository'
import { RedemptionService } from './redemption.service'

const CARD_ID = '0190a000-0000-7000-8000-0000000000c1'
const NOW = new Date('2026-10-03T12:00:00Z')

class FakeRedemptionRepository extends RedemptionRepository {
  state: RedemptionRequestState = { balance: 10, target: 10, active: null }
  attempts: RedemptionRequestAttempt[] = []
  found: RedemptionRecord | null = null
  lookups: { customerId: string; id: string }[] = []
  async request(
    attempt: RedemptionRequestAttempt,
    decide: (state: RedemptionRequestState) => RequestDecision,
  ): Promise<Result<RedemptionRecord, ErrorOf<'notFound'> | ErrorOf<'rewardNotReady'>>> {
    this.attempts.push(attempt)
    const decision = decide(this.state)
    if (decision.kind === 'notReady') return err({ code: 'rewardNotReady', remaining: decision.remaining })
    return ok(redemptionRecord({ code: attempt.newCode(), expiresAt: attempt.expiresAt }))
  }
  async find(customerId: string, id: string): Promise<RedemptionRecord | null> {
    this.lookups.push({ customerId, id })
    return this.found
  }
}

describe('redemption HTTP', () => {
  let app: INestApplication
  const repository = new FakeRedemptionRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RedemptionController],
      providers: [
        RedemptionService,
        { provide: RedemptionRepository, useValue: repository },
        { provide: Clock, useValue: { now: () => NOW } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    repository.state = { balance: 10, target: 10, active: null }
    repository.attempts = []
    repository.found = null
    repository.lookups = []
  })

  it('creates a 6-character readable code that lives for 10 minutes and answers the contract', async () => {
    const response = await request(app.getHttpServer()).post('/redemptions').send({ cardId: CARD_ID }).expect(200)
    expect(response.body.code).toMatch(/^[ACDEFGHJKLMNPQRTVWXY2-9]{6}$/)
    expect(response.body).toMatchObject({ cardId: CARD_ID, status: 'active', rewardTitle: 'Corte grátis' })
    expect(repository.attempts[0]?.expiresAt.toISOString()).toBe('2026-10-03T12:10:00.000Z')
    expect(repository.attempts[0]?.customerId).toBe(TEST_USER.id)
  })

  it('answers 409 rewardNotReady with how much is missing', async () => {
    repository.state = { balance: 7, target: 10, active: null }
    const response = await request(app.getHttpServer()).post('/redemptions').send({ cardId: CARD_ID }).expect(409)
    expect(response.body).toEqual({ code: 'rewardNotReady', remaining: 3 })
  })

  it.each([{}, { cardId: 'x' }, { cardId: 123 }])('rejects a malformed request %j before the database', async (body) => {
    await request(app.getHttpServer()).post('/redemptions').send(body).expect(400)
    expect(repository.attempts).toHaveLength(0)
  })

  it('reads a redemption only through the token user and never exposes the owner', async () => {
    repository.found = redemptionRecord()
    const response = await request(app.getHttpServer()).get('/redemptions/0190a000-0000-7000-8000-0000000000d1').expect(200)
    expect(repository.lookups[0]?.customerId).toBe(TEST_USER.id)
    expect(Object.keys(response.body).sort()).toEqual(['cardId', 'code', 'createdAt', 'expiresAt', 'id', 'rewardTitle', 'shopId', 'status'])
  })

  it('answers 404 notFound (redemption) for one that is not the customer’s', async () => {
    const response = await request(app.getHttpServer()).get('/redemptions/0190a000-0000-7000-8000-0000000000d1').expect(404)
    expect(response.body).toEqual({ code: 'notFound', entity: 'redemption' })
  })

  it('rejects an id that is not a uuid without touching the database', async () => {
    await request(app.getHttpServer()).get('/redemptions/nope').expect(400)
    expect(repository.lookups).toHaveLength(0)
  })
})
