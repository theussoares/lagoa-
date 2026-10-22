import type { Challenge } from '#shared/schemas/discover'
import type { FeaturedShop } from '#shared/schemas/showcase'
import type { ShopSummary } from '#shared/schemas/shop'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface DiscoverService {
  listShops(): Promise<Result<ShopSummary[], TransportError>>
  listFeatured(): Promise<Result<FeaturedShop[], TransportError>>
  listChallenges(): Promise<Result<Challenge[], TransportError>>
}
