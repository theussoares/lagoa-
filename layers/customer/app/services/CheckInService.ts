import type { CheckInResult } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type CheckInError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'checkInCooldown'> | TransportError

export interface CheckInService {
  /** O token vem do QR da loja; antifraude é decidida no servidor. */
  checkIn(shopQrToken: string): Promise<Result<CheckInResult, CheckInError>>
}
