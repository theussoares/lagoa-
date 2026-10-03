import { describe, expect, it } from 'vitest'
import { decideConsent, decideProfileUpdate, decideTerms } from './profile.rules'
import { profileRecord } from './profile.fixtures'

const now = new Date('2026-10-03T12:00:00Z')

describe('decideProfileUpdate', () => {
  it('lets the first birthday be set freely and starts the cooldown', () => {
    const result = decideProfileUpdate(profileRecord(), { firstName: 'Ana', birthday: '03-14' }, now)
    expect(result).toEqual({ ok: true, value: { firstName: 'Ana', birthday: '03-14', birthdayChangedAt: now } })
  })

  it('blocks a new date during the cooldown and says when it unlocks', () => {
    const current = profileRecord({ birthday: '03-14', birthdayChangedAt: new Date('2026-06-01T12:00:00Z') })
    const result = decideProfileUpdate(current, { firstName: 'Ana', birthday: '07-01' }, now)
    expect(result).toEqual({ ok: false, error: { code: 'birthdayLocked', changeableAt: '2027-06-01T12:00:00.000Z' } })
  })

  it('allows editing the name while the date stays the same, without resetting the cooldown', () => {
    const current = profileRecord({ birthday: '03-14', birthdayChangedAt: new Date('2026-06-01T12:00:00Z') })
    const result = decideProfileUpdate(current, { firstName: 'Ana Paula', birthday: '03-14' }, now)
    expect(result).toEqual({ ok: true, value: { firstName: 'Ana Paula', birthday: '03-14' } })
  })

  it('allows removing the date at any time without unlocking the next change', () => {
    const current = profileRecord({ birthday: '03-14', birthdayChangedAt: new Date('2026-06-01T12:00:00Z') })
    const result = decideProfileUpdate(current, { firstName: null, birthday: null }, now)
    expect(result).toEqual({ ok: true, value: { firstName: null, birthday: null } })
  })

  it('allows a new date once the cooldown has passed', () => {
    const current = profileRecord({ birthday: '03-14', birthdayChangedAt: new Date('2025-10-01T12:00:00Z') })
    const result = decideProfileUpdate(current, { firstName: null, birthday: '07-01' }, now)
    expect(result).toMatchObject({ ok: true, value: { birthday: '07-01', birthdayChangedAt: now } })
  })
})

describe('decideConsent', () => {
  it('records the choice and when it was made, for grant and revoke alike', () => {
    expect(decideConsent(true, now)).toEqual({ ok: true, value: { notificationsConsent: true, consentUpdatedAt: now } })
    expect(decideConsent(false, now)).toEqual({ ok: true, value: { notificationsConsent: false, consentUpdatedAt: now } })
  })
})

describe('decideTerms', () => {
  it('stamps the first acceptance', () => {
    expect(decideTerms(profileRecord(), now)).toEqual({ ok: true, value: { termsAcceptedAt: now } })
  })

  it('keeps the original acceptance on repeat calls', () => {
    const current = profileRecord({ termsAcceptedAt: new Date('2026-01-01T00:00:00Z') })
    expect(decideTerms(current, now)).toEqual({ ok: true, value: {} })
  })
})
