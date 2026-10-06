import type { RedemptionId } from '#shared/schemas/ids'
import type { RedemptionCode, RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** Loja pendente ou suspensa: o servidor recusa tudo que mexe com cliente. */
export type ShopClosedError = ErrorOf<'shopPendingApproval' | 'shopSuspended'>
export type ValidateRedemptionError =
  | ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>
  | ShopClosedError
  | TransportError

/** Balcão: resgate e caderneta. Ganhar é pelo QR da visita (`VisitQrService`). */
export interface CounterService {
  validateRedemption(code: RedemptionCode): Promise<Result<RedemptionPreview, ValidateRedemptionError>>
  confirmRedemption(id: RedemptionId): Promise<Result<CounterEntry, ValidateRedemptionError>>
  listTodayEntries(): Promise<Result<CounterEntry[], TransportError>>
}
