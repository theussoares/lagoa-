import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerModule } from '@nestjs/throttler'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { generateVisitToken } from '../../common/visit-token'
import { UserThrottlerGuard } from '../../auth/user-throttler.guard'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { acceptedProfile } from '../profile/profile.fixtures'
import { ProfileRepository } from '../profile/profile.repository'
import { FakeCheckInRepository, FIRST_VISIT, lockedVisitQr, stateOf, visitQrTarget } from './check-in.fixtures'
import { CheckInController } from './check-in.controller'
import { CheckInRepository } from './check-in.repository'
import { CheckInService } from './check-in.service'

const TOKEN = generateVisitToken()
const VISIT_CODE = 'K7M4P'

async function appWith(repository: FakeCheckInRepository, profiles: FixedProfileRepository, throttled: boolean): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: throttled
      ? [
          ThrottlerModule.forRoot([
            { name: 'default', ttl: 60_000, limit: 120 },
            { name: 'ip', ttl: 60_000, limit: 600, getTracker: (req) => String(req.ip ?? 'unknown') },
          ]),
        ]
      : [],
    controllers: [CheckInController],
    providers: [
      CheckInService,
      { provide: CheckInRepository, useValue: repository },
      { provide: ReferralSettlement, useValue: { settlePending: async () => 'none' } },
      { provide: Clock, useValue: { now: () => new Date('2026-10-03T12:00:00Z') } },
      { provide: ProfileRepository, useValue: profiles },
      // Mesma ordem do AppModule: auth primeiro, para o limite contar por usuário.
      { provide: APP_GUARD, useClass: FakeAuthGuard },
      ...(throttled ? [{ provide: APP_GUARD, useClass: UserThrottlerGuard }] : []),
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
    ],
  }).compile()
  const app = moduleRef.createNestApplication()
  await app.init()
  return app
}

describe('check-in HTTP (claim the visit QR)', () => {
  let app: INestApplication
  const profiles = new FixedProfileRepository(acceptedProfile())
  const repository = new FakeCheckInRepository(visitQrTarget())

  beforeAll(async () => {
    app = await appWith(repository, profiles, false)
  })
  afterAll(async () => app.close())

  beforeEach(() => {
    repository.target = visitQrTarget()
    repository.qr = lockedVisitQr()
    repository.state = FIRST_VISIT
    repository.calls = []
    repository.lookups = []
    repository.refusals = []
  })

  const byToken = (body: unknown) => request(app.getHttpServer()).post('/check-in').send(body as object)
  const byCode = (body: unknown) => request(app.getHttpServer()).post('/check-in/code').send(body as object)

  it('answers 200 with the visit result for a token', async () => {
    repository.state = stateOf({ balance: 4 })
    const response = await byToken({ token: TOKEN }).expect(200)
    expect(response.body).toMatchObject({ activity: { kind: 'visit', units: 1 }, card: { balance: 5, target: 10 } })
  })

  it('answers 200 with the visit result for a typed code', async () => {
    repository.state = stateOf({ balance: 4 })
    const response = await byCode({ visitCode: VISIT_CODE }).expect(200)
    expect(response.body).toMatchObject({ activity: { kind: 'visit', units: 1 }, card: { balance: 5 } })
    expect(repository.lookups).toEqual([{ kind: 'visitCode', code: VISIT_CODE }])
  })

  it.each([
    ['unknown, cancelled by the merchant or of an unapproved shop', null, lockedVisitQr(), 404, { code: 'invalidVisitQr' }],
    ['expired', visitQrTarget(), lockedVisitQr({ expiresAt: new Date('2026-10-03T12:00:00Z') }), 410, { code: 'visitQrExpired' }],
    ['used by someone else', visitQrTarget(), lockedVisitQr({ status: 'claimed', claimedBy: 'someone-else' }), 409, { code: 'visitQrAlreadyUsed' }],
    ['issued under an older program', visitQrTarget(), lockedVisitQr({ activeProgramId: 'p2' }), 409, { code: 'visitQrStale' }],
  ])('answers the same error body on both routes for a QR that is %s', async (_name, target, qr, status, body) => {
    repository.target = target
    repository.qr = qr
    expect((await byToken({ token: TOKEN }).expect(status)).body).toEqual(body)
    expect((await byCode({ visitCode: VISIT_CODE }).expect(status)).body).toEqual(body)
  })

  it('answers 404 invalidVisitQr for a malformed credential, without a lookup', async () => {
    expect((await byToken({ token: 'nope' }).expect(404)).body).toEqual({ code: 'invalidVisitQr' })
    expect((await byCode({ visitCode: '12' }).expect(404)).body).toEqual({ code: 'invalidVisitQr' })
    expect(repository.calls).toEqual([])
  })

  it('answers 422 shopQrJoinOnly for the legacy shop code on the claim route', async () => {
    const response = await byToken({ code: 'NAV4K7' }).expect(422)
    expect(response.body).toEqual({ code: 'shopQrJoinOnly' })
    expect(repository.calls).toEqual([])
  })

  it('answers 429 checkInCooldown with the time it opens, and notes the refusal on the QR', async () => {
    repository.state = stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') })
    const response = await byToken({ token: TOKEN }).expect(429)
    expect(response.body).toEqual({ code: 'checkInCooldown', availableAt: '2026-10-04T08:00:00.000Z' })
    expect(repository.refusals).toHaveLength(1)
  })

  it.each([
    ["an amount next to the token (the value is the merchant's, never the customer's)", { token: TOKEN, amountCents: 4590 }],
    ['a token and a shop code together', { token: TOKEN, code: 'NAV4K7' }],
    ['an empty body', {}],
    ['a token that is not text', { token: 123 }],
    ['a token over the input limit', { token: 'x'.repeat(65) }],
  ])('answers 400 on the token route for %s', async (_name, body) => {
    await byToken(body).expect(400)
    expect(repository.calls).toEqual([])
  })

  it.each([
    ['an extra field', { visitCode: VISIT_CODE, amountCents: 4590 }],
    ['the token key', { token: TOKEN }],
    ['an empty body', {}],
    ['a code that is not text', { visitCode: 12345 }],
    ['a code over the input limit', { visitCode: 'x'.repeat(33) }],
  ])('answers 400 on the code route for %s', async (_name, body) => {
    await byCode(body).expect(400)
    expect(repository.calls).toEqual([])
  })

  it.each(['/check-in', '/check-in/code'])('accepts a valid Idempotency-Key and rejects a malformed one on %s', async (path) => {
    const body = path === '/check-in' ? { token: TOKEN } : { visitCode: VISIT_CODE }
    await request(app.getHttpServer()).post(path).set('Idempotency-Key', 'abcdefghij0123456789').send(body).expect(200)
    await request(app.getHttpServer()).post(path).set('Idempotency-Key', 'short').send(body).expect(400)
    await request(app.getHttpServer()).post(path).set('Idempotency-Key', 'has spaces and !! symbols 123').send(body).expect(400)
  })

  it.each([
    ['/check-in', { token: TOKEN }],
    ['/check-in/code', { visitCode: VISIT_CODE }],
  ])('answers 403 termsNotAccepted on %s, and writes nothing, until the customer accepts the current terms', async (path, body) => {
    const before = profiles.record
    profiles.record = acceptedProfile({ termsAcceptedAt: null, termsVersion: null })
    expect((await request(app.getHttpServer()).post(path).send(body).expect(403)).body).toEqual({ code: 'termsNotAccepted' })
    profiles.record = acceptedProfile({ termsVersion: '2020-01' })
    await request(app.getHttpServer()).post(path).send(body).expect(403)
    profiles.record = before
    expect(repository.calls).toEqual([])
  })
})

describe('check-in HTTP limits', () => {
  let app: INestApplication

  beforeAll(async () => {
    // Nenhum QR existe: cada tentativa é uma credencial inventada, o caso que o limite protege.
    app = await appWith(new FakeCheckInRepository(null), new FixedProfileRepository(acceptedProfile()), true)
  })
  afterAll(async () => app.close())

  it('answers 429 rateLimited on the 11th try with a token in a minute (CA-21)', async () => {
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await request(app.getHttpServer()).post('/check-in').send({ token: generateVisitToken() }).expect(404)
    }
    const blocked = await request(app.getHttpServer()).post('/check-in').send({ token: generateVisitToken() }).expect(429)
    expect(blocked.body).toEqual({ code: 'rateLimited' })
  })

  it('answers 429 rateLimited on the 6th typed code in 10 minutes, a limit of its own', async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await request(app.getHttpServer()).post('/check-in/code').send({ visitCode: VISIT_CODE }).expect(404)
    }
    const blocked = await request(app.getHttpServer()).post('/check-in/code').send({ visitCode: VISIT_CODE }).expect(429)
    expect(blocked.body).toEqual({ code: 'rateLimited' })
  })
})
