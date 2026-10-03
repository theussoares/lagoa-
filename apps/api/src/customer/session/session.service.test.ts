import { describe, expect, it } from 'vitest'
import { profileRecord } from '../profile/profile.fixtures'
import { type ProfileRecord, ProfileRepository } from '../profile/profile.repository'
import { SessionService } from './session.service'

const USER_ID = '0190a000-0000-7000-8000-000000000001'

function serviceWith(record: ProfileRecord | null): SessionService {
  const repository = { findByUserId: async () => record } as unknown as ProfileRepository
  return new SessionService(repository)
}

describe('SessionService', () => {
  it('asks for registration when the login has no customer profile', async () => {
    expect(await serviceWith(null).current(USER_ID)).toEqual({ ok: false, error: { code: 'notFound', entity: 'customer' } })
  })

  it('marks the customer as new until the terms are accepted', async () => {
    const fresh = await serviceWith(profileRecord({ userId: USER_ID })).current(USER_ID)
    expect(fresh).toEqual({ ok: true, value: { role: 'customer', customerId: USER_ID, isNewCustomer: true } })
    const accepted = await serviceWith(profileRecord({ userId: USER_ID, termsAcceptedAt: new Date() })).current(USER_ID)
    expect(accepted).toMatchObject({ ok: true, value: { isNewCustomer: false } })
  })
})
