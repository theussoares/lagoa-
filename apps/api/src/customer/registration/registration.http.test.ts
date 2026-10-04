import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { PiiService } from '../../common/pii.service'
import { FakeAuthGuard, TEST_USER } from '../../test-support/fake-auth.guard'
import { createTestPii } from '../../test-support/pii'
import { profileRecord } from '../profile/profile.fixtures'
import { ProfileRepository } from '../profile/profile.repository'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { SessionService } from '../session/session.service'
import { type NewCustomer, type RegistrationOutcome, RegistrationRepository } from './registration.repository'
import { RegistrationController } from './registration.controller'
import { RegistrationService } from './registration.service'

class SwitchableRegistrationRepository extends RegistrationRepository {
  outcome: RegistrationOutcome = 'created'
  failWith: Error | null = null
  async register(_customer: NewCustomer): Promise<RegistrationOutcome> {
    if (this.failWith) throw this.failWith
    return this.outcome
  }
}

describe('customer registration HTTP', () => {
  let app: INestApplication
  const repository = new SwitchableRegistrationRepository()

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        RegistrationService,
        SessionService,
        { provide: PiiService, useValue: createTestPii() },
        { provide: RegistrationRepository, useValue: repository },
        { provide: ProfileRepository, useValue: new FixedProfileRepository(profileRecord({ userId: TEST_USER.id })) },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  beforeEach(() => {
    repository.outcome = 'created'
    repository.failWith = null
  })

  it('registers and answers with the customer session', async () => {
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: PHONE }).expect(201)
    expect(response.body).toEqual({ role: 'customer', customerId: TEST_USER.id, isNewCustomer: true })
  })

  it('answers 409 phoneAlreadyUsed without echoing the number', async () => {
    repository.outcome = 'phoneTaken'
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: PHONE }).expect(409)
    expect(response.body).toEqual({ code: 'phoneAlreadyUsed' })
  })

  it('answers 409 emailAlreadyUsed so the app does not loop on a fake 401', async () => {
    repository.outcome = 'emailTaken'
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: PHONE }).expect(409)
    expect(response.body).toEqual({ code: 'emailAlreadyUsed' })
  })

  it('answers 400 invalidPhone for a malformed number', async () => {
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: '123' }).expect(400)
    expect(response.body).toEqual({ code: 'invalidPhone' })
  })

  it('answers 500 internal with no detail when the repository blows up', async () => {
    repository.failWith = new Error('duplicate key value violates unique constraint (phone_hash)=(secret)')
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: PHONE }).expect(500)
    expect(response.body).toEqual({ code: 'internal' })
    expect(JSON.stringify(response.body)).not.toContain('secret')
  })
})

const PHONE = '67991230374'
