import { describe, expect, it } from 'vitest'
import { REFERRAL_CODE_LENGTH } from '#shared/constants/domain'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { createTestPii } from '../../test-support/pii'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { profileRecord } from '../profile/profile.fixtures'
import { type ProfileRecord, ProfileRepository } from '../profile/profile.repository'
import { SessionService } from '../session/session.service'
import { type NewCustomer, type RegistrationOutcome, RegistrationRepository } from './registration.repository'
import { RegistrationService } from './registration.service'

const pii = createTestPii()

class ScriptedRegistrationRepository extends RegistrationRepository {
  readonly received: NewCustomer[] = []
  constructor(private readonly outcomes: RegistrationOutcome[]) {
    super()
  }
  async register(customer: NewCustomer): Promise<RegistrationOutcome> {
    this.received.push(customer)
    return this.outcomes.shift() ?? 'created'
  }
}

class FixedProfileRepository extends ProfileRepository {
  constructor(private readonly record: ProfileRecord | null) {
    super()
  }
  async findByUserId(): Promise<ProfileRecord | null> {
    return this.record
  }
  async update(): Promise<never> {
    throw new Error('not used')
  }
}

function serviceWith(outcomes: RegistrationOutcome[], profile: ProfileRecord | null = profileRecord({ userId: TEST_USER.id })) {
  const repository = new ScriptedRegistrationRepository(outcomes)
  const service = new RegistrationService(repository, new SessionService(new FixedProfileRepository(profile)), pii)
  return { repository, service }
}

const PHONE = '(67) 99123-0374'

describe('RegistrationService', () => {
  it('stores the phone encrypted and hashed by its digits, and answers with the session', async () => {
    const { repository, service } = serviceWith(['created'])
    const result = await service.register(TEST_USER.id, ' Ana@Example.com ', PHONE)
    expect(result).toEqual({ ok: true, value: { role: 'customer', customerId: TEST_USER.id, isNewCustomer: true } })
    const saved = repository.received[0]
    expect(saved?.referralCode).toHaveLength(REFERRAL_CODE_LENGTH)
    expect(saved && pii.decrypt(saved.phoneEncrypted)).toBe('67991230374')
    expect(saved?.phoneHash.equals(pii.hashPhone(PhoneNumberSchema.parse('67991230374')))).toBe(true)
    expect(saved && pii.decrypt(saved.emailEncrypted)).toBe('ana@example.com')
  })

  it('repeating the registration cannot skip the terms: isNewCustomer still follows the profile', async () => {
    const { service } = serviceWith(['alreadyRegistered'], profileRecord({ userId: TEST_USER.id, termsAcceptedAt: null }))
    expect(await service.register(TEST_USER.id, 'ana@example.com', PHONE)).toMatchObject({ ok: true, value: { isNewCustomer: true } })
  })

  it('rejects a phone that is not a Brazilian mobile number without touching the database', async () => {
    const { repository, service } = serviceWith([])
    expect(await service.register(TEST_USER.id, 'ana@example.com', '1234')).toEqual({ ok: false, error: { code: 'invalidPhone' } })
    expect(repository.received).toHaveLength(0)
  })

  it.each([
    ['phoneTaken', 'phoneAlreadyUsed'],
    ['emailTaken', 'emailAlreadyUsed'],
  ] as const)('maps %s to the %s domain error', async (outcome, code) => {
    const { service } = serviceWith([outcome])
    expect(await service.register(TEST_USER.id, 'ana@example.com', PHONE)).toEqual({ ok: false, error: { code } })
  })

  it('needs an e-mail on the token', async () => {
    const { service } = serviceWith([])
    expect(await service.register(TEST_USER.id, undefined, PHONE)).toEqual({ ok: false, error: { code: 'unauthorized' } })
  })

  it('retries with a new referral code when the first one collides', async () => {
    const { repository, service } = serviceWith(['referralCodeTaken', 'created'])
    expect(await service.register(TEST_USER.id, 'ana@example.com', PHONE)).toMatchObject({ ok: true })
    expect(repository.received).toHaveLength(2)
    expect(repository.received[0]?.referralCode).not.toBe(repository.received[1]?.referralCode)
  })

  it('gives up after repeated collisions instead of looping forever', async () => {
    const { service } = serviceWith(Array.from({ length: 5 }, () => 'referralCodeTaken' as const))
    await expect(service.register(TEST_USER.id, 'ana@example.com', PHONE)).rejects.toThrow('referral code')
  })
})
