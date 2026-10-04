import type { LoyaltyCardId, RedemptionId } from '#shared/schemas/ids'
import type { Redemption } from '#shared/schemas/redemption'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type RequestRedemptionCodeError = ErrorOf<'notFound' | 'rewardNotReady' | 'termsNotAccepted'> | TransportError

export interface RewardRedemptionService {
  /** Gera (ou devolve o ainda válido) código de resgate do cartão. */
  requestCode(cardId: LoyaltyCardId): Promise<Result<Redemption, RequestRedemptionCodeError>>
  /** Para a tela do código saber quando o lojista confirmou ou quando venceu. */
  getRedemption(id: RedemptionId): Promise<Result<Redemption, ErrorOf<'notFound'> | TransportError>>
}
