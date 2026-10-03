import type { CustomerProfile, ProfileUpdate } from '#shared/schemas/customer'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ProfileService {
  getProfile(): Promise<Result<CustomerProfile, TransportError>>
  /** Aniversário trocado há pouco volta `birthdayLocked` (antifraude do bônus, decidido no servidor). */
  updateProfile(update: ProfileUpdate): Promise<Result<CustomerProfile, TransportError | ErrorOf<'birthdayLocked'>>>
  /** Consentimento de avisos: explícito e revogável a qualquer momento. */
  setNotificationConsent(granted: boolean): Promise<Result<CustomerProfile, TransportError>>
  acceptTerms(): Promise<Result<CustomerProfile, TransportError>>
}
