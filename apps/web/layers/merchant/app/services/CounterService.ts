import type { RedemptionId } from '#shared/schemas/ids'
import type { RedemptionCode, RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry, CounterToday } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

/** Loja pendente ou suspensa: o servidor recusa tudo que mexe com cliente. */
export type ShopClosedError = ErrorOf<'shopPendingApproval' | 'shopSuspended'>
/** Entre o pedido e a entrega a meta pode ter subido ou o prêmio vencido: o servidor recusa e o código deixa de valer. */
export type ConfirmRedemptionError = ValidateRedemptionError | ErrorOf<'rewardNotReady'>

export type ValidateRedemptionError =
  | ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>
  | ShopClosedError
  | TransportError

/** Balcão: resgate e caderneta. Ganhar é pelo QR da visita (`VisitQrService`). */
export interface CounterService {
  validateRedemption(code: RedemptionCode): Promise<Result<RedemptionPreview, ValidateRedemptionError>>
  confirmRedemption(id: RedemptionId): Promise<Result<CounterEntry, ConfirmRedemptionError>>
  listTodayEntries(): Promise<Result<CounterToday, TransportError>>
}
