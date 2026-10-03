import type { CustomerProfile, ProfileUpdate } from '#shared/schemas/customer'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface ProfileService {
  getProfile(): Promise<Result<CustomerProfile, TransportError>>
  updateProfile(update: ProfileUpdate): Promise<Result<CustomerProfile, TransportError>>
  /** Consentimento de avisos: explícito e revogável a qualquer momento. */
  setNotificationConsent(granted: boolean): Promise<Result<CustomerProfile, TransportError>>
  acceptTerms(): Promise<Result<CustomerProfile, TransportError>>
}
