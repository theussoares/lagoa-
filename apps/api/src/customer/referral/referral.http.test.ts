import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { FakeAuthGuard } from '../../test-support/fake-auth.guard'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { acceptedProfile } from '../profile/profile.fixtures'
import { ProfileRepository } from '../profile/profile.repository'
import { ReferralController } from './referral.controller'
import { type CaptureOutcome, ReferralRepository } from './referral.repository'
import { ReferralService } from './referral.service'

class FakeReferralRepository extends ReferralRepository {
  outcome: CaptureOutcome = 'captured'
  async findOwnReferralCode(): Promise<string | null> {
    return 'ACDEFGHJ'
  }
  async capture(): Promise<CaptureOutcome> {
    return this.outcome
  }
}

describe('referral HTTP', () => {
  let app: INestApplication
  const profiles = new FixedProfileRepository(acceptedProfile())
  const repository = new FakeReferralRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        ReferralService,
        { provide: ReferralRepository, useValue: repository },
        { provide: ProfileRepository, useValue: profiles },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('gives the customer the code for their invite link', async () => {
    const response = await request(app.getHttpServer()).get('/referrals/me').expect(200)
    expect(response.body).toEqual({ referralCode: 'ACDEFGHJ' })
  })

  it.each(['captured', 'unknownReferrer', 'selfReferral', 'alreadyCustomer'] as const)('answers 204 with no body for "%s"', async (outcome) => {
    repository.outcome = outcome
    const response = await request(app.getHttpServer()).post('/referrals').send({ referralCode: 'ACDEFGHJ', shopCode: 'NAV4K7' }).expect(204)
    expect(response.body).toEqual({})
  })

  it('answers 401 unauthorized for a login with no customer profile', async () => {
    repository.outcome = 'noProfile'
    const response = await request(app.getHttpServer()).post('/referrals').send({ referralCode: 'ACDEFGHJ', shopCode: 'NAV4K7' }).expect(401)
    expect(response.body).toEqual({ code: 'unauthorized' })
  })

  it.each([{}, { referralCode: 'A' }, { referralCode: 1, shopCode: 2 }, { referralCode: 'x'.repeat(33), shopCode: 'NAV4K7' }])('rejects a malformed body %j', async (body) => {
    await request(app.getHttpServer()).post('/referrals').send(body).expect(400)
  })

  it('answers 403 termsNotAccepted, and writes nothing, until the customer accepts the current terms', async () => {
    const before = profiles.record
    profiles.record = profileRecordFor('none')
    const refused = await request(app.getHttpServer()).post('/referrals').send({ referralCode: 'ACDEFGHJ', shopCode: 'NAV4K7' }).expect(403)
    expect(refused.body).toEqual({ code: 'termsNotAccepted' })
    profiles.record = profileRecordFor('old')
    await request(app.getHttpServer()).post('/referrals').send({ referralCode: 'ACDEFGHJ', shopCode: 'NAV4K7' }).expect(403)
    profiles.record = before
  })
})

function profileRecordFor(kind: 'none' | 'old') {
  return kind === 'none' ? acceptedProfile({ termsAcceptedAt: null, termsVersion: null }) : acceptedProfile({ termsVersion: '2020-01' })
}
