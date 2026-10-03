import { describe, expect, it } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { profileRecord } from '../profile/profile.fixtures'
import { type ProfileRecord, ProfileRepository } from '../profile/profile.repository'
import { SessionService } from './session.service'

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

const serviceWith = (record: ProfileRecord | null): SessionService => new SessionService(new FixedProfileRepository(record))

describe('SessionService', () => {
  it('asks for registration when the login has no customer profile', async () => {
    expect(await serviceWith(null).current(TEST_USER.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  })

  it('marks the customer as new until the terms are accepted', async () => {
    const fresh = await serviceWith(profileRecord({ userId: TEST_USER.id })).current(TEST_USER.id)
    expect(fresh).toEqual({ ok: true, value: { role: 'customer', customerId: TEST_USER.id, isNewCustomer: true } })
    const accepted = await serviceWith(profileRecord({ userId: TEST_USER.id, termsAcceptedAt: new Date() })).current(TEST_USER.id)
    expect(accepted).toMatchObject({ ok: true, value: { isNewCustomer: false } })
  })
})
