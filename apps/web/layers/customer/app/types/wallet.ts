import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { Translate } from '#layers/core/app/types/i18n'
import type { LedgerEntryModel, StampCardModel } from '#layers/ui/app/types/wallet'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { TransportError } from '#shared/types/errors'

export type SeenBalances = Readonly<Record<string, number>>

export interface SeenStamps {
  snapshot: () => SeenBalances
  remember: (balances: SeenBalances) => void
}

export interface WalletCardModelOptions {
  readonly t: Translate
  /** Saldo que a pessoa já tinha visto neste cartão; o que passar disso recebe a batida. */
  readonly seenBalance: number
  readonly formatDate: (iso: string) => string
}

export interface WalletScreen {
  readonly cardsState: AsyncResultState<WalletCard[], TransportError>
  readonly reloadCards: () => Promise<void>
  readonly activityState: AsyncResultState<WalletActivity[], TransportError>
  readonly cards: StampCardModel[]
  activeId: string
  readonly greeting: string
  readonly ledger: LedgerEntryModel[]
  readonly cityHeaderImage: string
}
