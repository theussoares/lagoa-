import type { HitsBanner, HitsQuery, PublicHitItemPage } from '#shared/schemas/showcase'
import type { TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export interface HitsService {
  list(query: HitsQuery): Promise<Result<PublicHitItemPage, TransportError>>
  banners(): Promise<Result<HitsBanner[], TransportError>>
}
