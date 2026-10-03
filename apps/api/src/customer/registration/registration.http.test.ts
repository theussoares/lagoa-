import { randomBytes } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { AuthenticatedRequest } from '../../auth/auth.types'
import { AllExceptionsFilter } from '../../common/http/all-exceptions.filter'
import { PiiService } from '../../common/pii.service'
import type { Env } from '../../config/env'
import { RegistrationController } from './registration.controller'
import { type RegistrationOutcome, RegistrationRepository } from './registration.repository'
import { RegistrationService } from './registration.service'

const USER_ID = '0190a000-0000-7000-8000-000000000001'
let outcome: RegistrationOutcome = 'created'

const fakeAuthGuard = {
  canActivate: (context: { switchToHttp: () => { getRequest: () => AuthenticatedRequest } }): boolean => {
    context.switchToHttp().getRequest().user = { id: USER_ID, email: 'ana@example.com' }
    return true
  },
}

describe('customer registration HTTP', () => {
  let app: INestApplication

  beforeAll(async () => {
    const pii = new PiiService({
      PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      PII_HASH_PEPPER: 'a-long-enough-test-pepper',
    } as Env)
    const moduleRef = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [
        RegistrationService,
        { provide: PiiService, useValue: pii },
        { provide: RegistrationRepository, useValue: { register: async () => outcome } },
        { provide: APP_GUARD, useValue: fakeAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile()
    app = moduleRef.createNestApplication()
    await app.init()
  })

  afterAll(async () => app.close())

  it('registers and answers with the customer session', async () => {
    outcome = 'created'
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: '(67) 99123-0374' }).expect(201)
    expect(response.body).toEqual({ role: 'customer', customerId: USER_ID, isNewCustomer: true })
  })

  it('answers 409 phoneAlreadyUsed without echoing the number', async () => {
    outcome = 'phoneTaken'
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: '67991230374' }).expect(409)
    expect(response.body).toEqual({ code: 'phoneAlreadyUsed' })
  })

  it('answers 400 invalidPhone for a malformed number', async () => {
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: '123' }).expect(400)
    expect(response.body).toEqual({ code: 'invalidPhone' })
  })

  it('answers 500 internal with no detail when the repository blows up', async () => {
    const original = outcome
    const failing = app.get(RegistrationRepository)
    failing.register = async () => {
      throw new Error('duplicate key value violates unique constraint (phone_hash)=(secret)')
    }
    const response = await request(app.getHttpServer()).post('/customer/registration').send({ phone: '67991230374' }).expect(500)
    expect(response.body).toEqual({ code: 'internal' })
    outcome = original
  })
})
