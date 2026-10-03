import type { WalletCard } from '#shared/schemas/loyaltyCard'

export interface RewardGroups {
  readonly ready: readonly WalletCard[]
  /** Na ordem da carteira: o mais perto do prêmio primeiro. */
  readonly upcoming: readonly WalletCard[]
}
