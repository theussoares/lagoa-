import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { EarningPlan } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { checkInShop } from './check-in.fixtures'
import { CheckInController } from './check-in.controller'
import { type CheckInAttempt, type CheckInRecorded, CheckInRepository, type CheckInShop, type CheckInState } from './check-in.repository'
import { CheckInService } from './check-in.service'

class FakeCheckInRepository extends CheckInRepository {
  shop: CheckInShop | null = checkInShop()
  state: CheckInState = { card: null, lastVisitAt: null, birthday: null }
  async findShopByCode(): Promise<CheckInShop | null> {
    return this.shop
  }
  async record<E>(
    _attempt: CheckInAttempt,
    decide: (state: CheckInState) => Result<EarningPlan, E>,
  ): Promise<Result<CheckInRecorded, E | ErrorOf<'unauthorized'>>> {
    const decision = decide(this.state)
    return decision.ok ? ok({ cardCreated: false, cardId: 'card-1', entryId: '0190a000-0000-7000-8000-0000000000e1', plan: decision.value }) : decision
  }
}

describe('check-in HTTP', () => {
  let app: INestApplication
  const repository = new FakeCheckInRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckInController],
      providers: [
        CheckInService,
        { provide: CheckInRepository, useValue: repository },
        { provide: ReferralSettlement, useValue: { settlePending: async () => 'none' } },
        { provide: Clock, useValue: { now: () => new Date('2026-10-03T12:00:00Z') } },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  const post = (body: unknown) => request(app.getHttpServer()).post('/check-in').send(body as object)

  it('answers 201 with the check-in result', async () => {
    repository.state = { card: { balance: 4, rewardExpiresAt: null }, lastVisitAt: null, birthday: null }
    const response = await post({ code: 'NAV4K7' }).expect(201)
    expect(response.body).toMatchObject({ activity: { kind: 'checkIn', units: 1 }, card: { balance: 5, target: 10 } })
  })

  it('answers 404 invalidShopQr for an unknown code', async () => {
    repository.shop = null
    const response = await post({ code: 'NAV4K7' }).expect(404)
    expect(response.body).toEqual({ code: 'invalidShopQr' })
    repository.shop = checkInShop()
  })

  it('answers 429 checkInCooldown with the time it opens', async () => {
    repository.state = { card: { balance: 1, rewardExpiresAt: null }, lastVisitAt: new Date('2026-10-03T08:00:00Z'), birthday: null }
    const response = await post({ code: 'NAV4K7' }).expect(429)
    expect(response.body).toEqual({ code: 'checkInCooldown', availableAt: '2026-10-04T08:00:00.000Z' })
  })

  it.each([{}, { code: 123 }, { code: 'x'.repeat(33) }])('answers 400 for a malformed body %j', async (body) => {
    await post(body).expect(400)
  })
})
