import type { Birthday } from '#shared/schemas/common'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ProfileRecord {
  readonly userId: string
  readonly firstName: string | null
  readonly birthday: Birthday | null
  readonly birthdayChangedAt: Date | null
  readonly notificationsConsent: boolean
  readonly consentUpdatedAt: Date | null
  readonly termsAcceptedAt: Date | null
  readonly phoneEncrypted: Buffer
}

/** Só os campos que o próprio cliente pode mudar. Campo ausente = não muda. */
export type ProfilePatch = Partial<
  Pick<
    ProfileRecord,
    'firstName' | 'birthday' | 'birthdayChangedAt' | 'notificationsConsent' | 'consentUpdatedAt' | 'termsAcceptedAt'
  >
>

export type ProfileNotFound = ErrorOf<'notFound'>

export abstract class ProfileRepository {
  abstract findByUserId(userId: string): Promise<ProfileRecord | null>

  /**
   * Lê o perfil com lock de linha, deixa `decide` escolher o que mudar e grava tudo numa
   * transação: duas requisições simultâneas não furam a regra de quem decide.
   */
  abstract update<E>(
    userId: string,
    decide: (current: ProfileRecord) => Result<ProfilePatch, E>,
  ): Promise<Result<ProfileRecord, E | ProfileNotFound>>
}
