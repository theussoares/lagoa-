import type { CheckInCode, ShopJoinResult } from '#shared/schemas/shop'
import type { CheckInResult } from '#shared/schemas/visit'
import type { VisitQrCredential } from '#shared/schemas/visitQr'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type ShopJoinError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'termsNotAccepted'> | TransportError
export type ClaimVisitQrError =
  | ErrorOf<'invalidVisitQr' | 'visitQrExpired' | 'visitQrAlreadyUsed' | 'visitQrStale' | 'checkInCooldown' | 'termsNotAccepted'>
  | TransportError
/** União que a tela de check-in mostra: os erros de entrar e de ganhar, mais os dois que a leitura do QR já pode dar. */
export type CheckInError =
  | ShopJoinError
  | ClaimVisitQrError
  | ErrorOf<'invalidShopQr' | 'invalidVisitQr' | 'checkInCooldown'>

export interface CheckInService {
  /** QR do cartaz (ou código de 6 digitado): entra no clube; não rende. */
  joinShop(code: CheckInCode): Promise<Result<ShopJoinResult, ShopJoinError>>
  /** QR da visita (ou código curto): ganha. Validade, uso único e antifraude são do servidor. */
  claimVisitQr(credential: VisitQrCredential): Promise<Result<CheckInResult, ClaimVisitQrError>>
}
