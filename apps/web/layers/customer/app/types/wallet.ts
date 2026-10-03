import type { Translate } from '#layers/core/app/types/i18n'

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
