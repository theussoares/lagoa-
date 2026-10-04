import { TERMS_VERSION } from '#shared/constants/domain'
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
    termsVersion: null,
    phoneEncrypted: Buffer.alloc(0),
    ...overrides,
  }
}

/** Cliente que já aceitou a versão atual dos termos: o que as rotas de escrita exigem. */
export function acceptedProfile(overrides: Partial<ProfileRecord> = {}): ProfileRecord {
  return profileRecord({ termsAcceptedAt: new Date('2026-01-01T00:00:00Z'), termsVersion: TERMS_VERSION, ...overrides })
}
