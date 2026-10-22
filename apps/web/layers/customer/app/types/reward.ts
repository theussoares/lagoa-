import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ReadyRewardModel, UpcomingRewardModel } from '#layers/ui/app/types/rewards'
import type { LedgerEntryModel } from '#layers/ui/app/types/wallet'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { TransportError } from '#shared/types/errors'

export interface RewardGroups {
  readonly ready: readonly WalletCard[]
  /** Na ordem da carteira: o mais perto do prêmio primeiro. */
  readonly upcoming: readonly WalletCard[]
}

/** Os prêmios sem a moldura da tela: servem à página Prêmios e à aba Prêmios da Carteira. */
export interface RewardLists {
  readonly cardsState: AsyncResultState<WalletCard[], TransportError>
  readonly historyState: AsyncResultState<WalletActivity[], TransportError>
  readonly reloadCards: () => Promise<void>
  readonly reloadHistory: () => Promise<void>
  readonly ready: ReadyRewardModel[]
  readonly upcoming: UpcomingRewardModel[]
  readonly closest: string | null
  readonly hasCards: boolean
  readonly history: LedgerEntryModel[]
}

export interface RewardsScreen extends RewardLists {
  readonly cityHeaderImage: string
}
