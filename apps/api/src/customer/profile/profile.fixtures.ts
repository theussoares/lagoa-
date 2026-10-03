import type { ProfileRecord } from './profile.repository'

export function profileRecord(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return {
    userId: '0190a000-0000-7000-8000-000000000001',
    firstName: null,
    birthday: null,
    birthdayChangedAt: null,
    notificationsConsent: false,
    consentUpdatedAt: null,
    termsAcceptedAt: null,
    phoneEncrypted: Buffer.alloc(0),
    ...overrides,
  }
}
