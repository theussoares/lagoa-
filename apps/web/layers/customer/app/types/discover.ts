import type { ShopSummary } from '#shared/schemas/shop'

export interface ShopGroups {
  /** Lojas onde a pessoa ainda não tem cartão. */
  readonly fresh: readonly ShopSummary[]
  readonly known: readonly ShopSummary[]
}
