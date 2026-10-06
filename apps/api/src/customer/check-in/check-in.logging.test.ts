import { Logger, type INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from '../../common/clock'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { generateVisitToken } from '../../common/visit-token'
import { ReferralSettlement } from '../../ledger/referral-settlement'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { acceptedProfile } from '../profile/profile.fixtures'
import { ProfileRepository } from '../profile/profile.repository'
import { CheckInController } from './check-in.controller'
import { FakeCheckInRepository, lockedVisitQr, stateOf, visitQrTarget } from './check-in.fixtures'
import { CheckInRepository } from './check-in.repository'
import { CheckInService } from './check-in.service'

const TOKEN = generateVisitToken()
const VISIT_CODE = 'K7M4P'
const PHONE = '67991230374'
/** O que um driver de banco poderia pôr na mensagem de erro: credencial, celular e e-mail. */
const LEAKY_MESSAGE = `driver says: key (token)=(${TOKEN}) phone=${PHONE} email=${TEST_USER.email}`

/** CA-26: usar, recusar e falhar não escrevem token, celular nem e-mail em nenhum log. */
describe('claiming a visit QR leaves no credential or personal data in the logs', () => {
  let app: INestApplication
  const repository = new FakeCheckInRepository(visitQrTarget())
  const logged: string[] = []
  const referrals = { fail: false, settlePending: async (): Promise<'none'> => 'none' }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckInController],
      providers: [
        CheckInService,
        { provide: CheckInRepository, useValue: repository },
        {
          provide: ReferralSettlement,
          useValue: {
            settlePending: async () => {
              if (referrals.fail) throw new Error(LEAKY_MESSAGE)
              return 'none'
            },
          },
        },
        { provide: Clock, useValue: { now: () => new Date('2026-10-03T12:00:00Z') } },
        { provide: ProfileRepository, useValue: new FixedProfileRepository(acceptedProfile()) },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    logged.length = 0
    repository.findFails = null
    referrals.fail = false
    repository.target = visitQrTarget()
    repository.qr = lockedVisitQr()
    repository.state = stateOf({ balance: 1 })
    repository.noteFails = false
    for (const level of ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message))
      })
    }
  })

  afterEach(() => vi.restoreAllMocks())

  const expectNothingSensitiveLogged = () => {
    const everything = logged.join('\n')
    for (const secret of [TOKEN, VISIT_CODE, PHONE, TEST_USER.email ?? '', 'secret']) expect(everything).not.toContain(secret)
  }
  const claim = (body: object, path = '/check-in') => request(app.getHttpServer()).post(path).send(body)

  it('after a successful use, even when paying the referral blows up', async () => {
    referrals.fail = true
    await claim({ token: TOKEN }).expect(200)
    expect(logged).toHaveLength(1)
    expectNothingSensitiveLogged()
  })

  it('after a refusal by the window, even when noting it on the QR blows up', async () => {
    repository.state = stateOf({ balance: 1, lastVisitAt: new Date('2026-10-03T08:00:00Z') })
    repository.noteFails = true
    await claim({ token: TOKEN }).expect(429)
    expect(logged).toHaveLength(1)
    expectNothingSensitiveLogged()
  })

  it.each([
    ['expired', lockedVisitQr({ expiresAt: new Date('2026-10-03T12:00:00Z') })],
    ['already used', lockedVisitQr({ status: 'claimed', claimedBy: 'someone-else' })],
    ['cancelled', lockedVisitQr({ status: 'cancelled', cancelReason: 'merchant' })],
  ])('after refusing a QR that is %s', async (_name, qr) => {
    repository.qr = qr
    await claim({ token: TOKEN }).expect((response) => expect(response.status).toBeGreaterThanOrEqual(400))
    await claim({ visitCode: VISIT_CODE }, '/check-in/code').expect((response) => expect(response.status).toBeGreaterThanOrEqual(400))
    expectNothingSensitiveLogged()
  })

  it('after an unexpected error, which answers 500 internal and logs only its type', async () => {
    repository.findFails = new Error(LEAKY_MESSAGE)
    const byToken = await claim({ token: TOKEN }).expect(500)
    const byCode = await claim({ visitCode: VISIT_CODE }, '/check-in/code').expect(500)
    expect(byToken.body).toEqual({ code: 'internal' })
    expect(byCode.body).toEqual({ code: 'internal' })
    expect(logged).toHaveLength(2)
    expect(logged.every((line) => line.startsWith('Unhandled Error'))).toBe(true)
    expectNothingSensitiveLogged()
  })
})
