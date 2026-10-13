import type { AsyncResultState } from '#layers/core/app/types/asyncResult'
import type { ChallengeModel, KnownShopModel, ShopTeaserModel } from '#layers/ui/app/types/discover'
import type { ShopSummary } from '#shared/schemas/shop'
import type { TransportError } from '#shared/types/errors'

export interface ShopGroups {
  /** Lojas onde a pessoa ainda não tem cartão. */
  readonly fresh: readonly ShopSummary[]
  readonly known: readonly ShopSummary[]
}

export interface DiscoverScreen {
  query: string
  readonly searching: boolean
  readonly loading: boolean
  readonly shopsState: AsyncResultState<ShopSummary[], TransportError>
  readonly reloadShops: () => Promise<void>
  readonly shopCount: number
  readonly fresh: ShopTeaserModel[]
  readonly known: KnownShopModel[]
  readonly heroChallenge: ChallengeModel | null
  readonly otherChallenges: ChallengeModel[]
  readonly cityHeaderImage: string
  readonly mapUrl: string
}
