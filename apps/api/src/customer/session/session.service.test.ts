import { describe, expect, it } from 'vitest'
import { TEST_USER } from '../../test-support/fake-auth.guard'
import { acceptedProfile, profileRecord } from '../profile/profile.fixtures'
import type { ProfileRecord } from '../profile/profile.repository'
import { FixedProfileRepository } from '../../test-support/fixed-profile.repository'
import { SessionService } from './session.service'

const serviceWith = (record: ProfileRecord | null): SessionService => new SessionService(new FixedProfileRepository(record))

describe('SessionService', () => {
  it('asks for registration when the login has no customer profile', async () => {
    expect(await serviceWith(null).current(TEST_USER.id)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  })

  it('marks the customer as new until the current terms are accepted', async () => {
    const fresh = await serviceWith(profileRecord({ userId: TEST_USER.id })).current(TEST_USER.id)
    expect(fresh).toEqual({ ok: true, value: { role: 'customer', customerId: TEST_USER.id, isNewCustomer: true } })
    const accepted = await serviceWith(acceptedProfile({ userId: TEST_USER.id })).current(TEST_USER.id)
    expect(accepted).toMatchObject({ ok: true, value: { isNewCustomer: false } })
    const staleVersion = await serviceWith(acceptedProfile({ userId: TEST_USER.id, termsVersion: '2020-01' })).current(TEST_USER.id)
    expect(staleVersion).toMatchObject({ ok: true, value: { isNewCustomer: true } })
  })
})
