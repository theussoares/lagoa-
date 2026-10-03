import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { PiiService } from '../../common/pii.service'
import type { Env } from '../../config/env'
import {
  type NewCustomer,
  type RegistrationOutcome,
  RegistrationRepository,
} from './registration.repository'
import { REFERRAL_CODE_LENGTH, RegistrationService } from './registration.service'

const pii = new PiiService({
  PII_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
  PII_HASH_PEPPER: 'a-long-enough-test-pepper',
} as Env)

class ScriptedRepository extends RegistrationRepository {
  readonly received: NewCustomer[] = []
  constructor(private readonly outcomes: RegistrationOutcome[]) {
    super()
  }
  async register(customer: NewCustomer): Promise<RegistrationOutcome> {
    this.received.push(customer)
    return this.outcomes.shift() ?? 'created'
  }
}

const USER_ID = '0190a000-0000-7000-8000-000000000001'

describe('RegistrationService', () => {
  it('creates the customer with the phone stored encrypted and hashed by its digits', async () => {
    const repository = new ScriptedRepository(['created'])
    const result = await new RegistrationService(repository, pii).register(USER_ID, ' Ana@Example.com ', '(67) 99123-0374')
    expect(result).toEqual({ ok: true, value: { customerId: USER_ID, created: true } })
    const [saved] = repository.received
    expect(saved?.referralCode).toHaveLength(REFERRAL_CODE_LENGTH)
    expect(pii.decrypt(saved!.phoneEncrypted)).toBe('67991230374')
    expect(saved!.phoneHash.equals(pii.hash('67991230374'))).toBe(true)
    expect(pii.decrypt(saved!.emailEncrypted)).toBe('ana@example.com')
  })

  it('is idempotent for an account that already registered', async () => {
    const result = await new RegistrationService(new ScriptedRepository(['alreadyRegistered']), pii).register(
      USER_ID, 'ana@example.com', '67991230374',
    )
    expect(result).toEqual({ ok: true, value: { customerId: USER_ID, created: false } })
  })

  it('rejects a phone that is not a Brazilian mobile number', async () => {
    const repository = new ScriptedRepository([])
    const result = await new RegistrationService(repository, pii).register(USER_ID, 'ana@example.com', '1234')
    expect(result).toEqual({ ok: false, error: { code: 'invalidPhone' } })
    expect(repository.received).toHaveLength(0)
  })

  it('refuses a phone that belongs to another account', async () => {
    const result = await new RegistrationService(new ScriptedRepository(['phoneTaken']), pii).register(
      USER_ID, 'ana@example.com', '67991230374',
    )
    expect(result).toEqual({ ok: false, error: { code: 'phoneAlreadyUsed' } })
  })

  it('needs an e-mail on the token', async () => {
    const result = await new RegistrationService(new ScriptedRepository([]), pii).register(USER_ID, undefined, '67991230374')
    expect(result).toEqual({ ok: false, error: { code: 'unauthorized' } })
  })

  it('retries with a new referral code when the first one collides', async () => {
    const repository = new ScriptedRepository(['referralCodeTaken', 'created'])
    const result = await new RegistrationService(repository, pii).register(USER_ID, 'ana@example.com', '67991230374')
    expect(result).toMatchObject({ ok: true, value: { created: true } })
    expect(repository.received).toHaveLength(2)
    expect(repository.received[0]?.referralCode).not.toBe(repository.received[1]?.referralCode)
  })
})
