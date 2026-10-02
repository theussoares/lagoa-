import type { CheckInCode } from '#shared/schemas/shop'
import type { CheckInResult } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type CheckInError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'checkInCooldown'> | TransportError

export interface CheckInService {
  /** O código vem do QR da loja ou é digitado; existência e antifraude são decididas no servidor. */
  checkIn(code: CheckInCode): Promise<Result<CheckInResult, CheckInError>>
}
