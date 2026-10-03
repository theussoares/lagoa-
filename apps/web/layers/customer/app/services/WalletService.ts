import type { ShopId } from '#shared/schemas/ids'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface WalletService {
  /** Cartões já ordenados por proximidade do prêmio. */
  listCards(): Promise<Result<WalletCard[], TransportError>>
  getCard(shopId: ShopId): Promise<Result<WalletCard, ErrorOf<'notFound'> | TransportError>>
  listActivity(limit: number): Promise<Result<WalletActivity[], TransportError>>
  /** Só os resgates entregues no balcão, do mais novo para o mais antigo. */
  listRewardHistory(limit: number): Promise<Result<WalletActivity[], TransportError>>
}
