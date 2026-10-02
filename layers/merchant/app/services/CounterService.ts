import type { RedemptionId } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { RedemptionCode, RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type RegisterVisitError = ErrorOf<'invalidAmount' | 'amountNotAccepted'> | TransportError
export type ValidateRedemptionError =
  | ErrorOf<'redemptionInvalid' | 'redemptionExpired' | 'redemptionAlreadyUsed'>
  | TransportError

/** Balcão: tudo que o atendente faz entre um cliente e outro. */
export interface CounterService {
  /** Dá 1 visita (carimbo ou pontos por visita). Cliente novo ganha cartão na hora. */
  registerVisit(phone: PhoneNumber): Promise<Result<VisitRegistered, RegisterVisitError>>
  /** Lança por valor (só no modo pontos por real). */
  registerAmount(phone: PhoneNumber, amountCents: number): Promise<Result<VisitRegistered, RegisterVisitError>>
  validateRedemption(code: RedemptionCode): Promise<Result<RedemptionPreview, ValidateRedemptionError>>
  confirmRedemption(id: RedemptionId): Promise<Result<CounterEntry, ValidateRedemptionError>>
  listTodayEntries(): Promise<Result<CounterEntry[], TransportError>>
}
