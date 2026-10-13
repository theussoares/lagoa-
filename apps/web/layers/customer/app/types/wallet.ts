import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { Translate } from '#layers/core/app/types/i18n'
import type { LedgerEntryModel, StampCardModel } from '#layers/ui/app/types/wallet'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { TransportError } from '#shared/types/errors'

/** Abas da carteira: todos, com prêmio liberado, ainda juntando. */
export type WalletFilter = 'all' | 'ready' | 'progress'

export interface WalletFilterOption {
  readonly value: WalletFilter
  readonly label: string
  readonly count: number
}

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
  /** Todos os cartões da pessoa. */
  readonly cards: StampCardModel[]
  /** Os que passam na aba e na busca. */
  readonly visibleCards: StampCardModel[]
  filter: WalletFilter
  query: string
  readonly filterCounts: Record<WalletFilter, number>
  /** Cartão aberto na lista (um por vez); vazio = todos fechados. */
  expandedId: string
  readonly toggleCard: (id: string) => void
  readonly greeting: string
  readonly ledger: LedgerEntryModel[]
  readonly cityHeaderImage: string
}
