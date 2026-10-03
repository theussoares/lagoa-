export type SeenBalances = Readonly<Record<string, number>>

export interface SeenStamps {
  snapshot: () => SeenBalances
  remember: (balances: SeenBalances) => void
}
