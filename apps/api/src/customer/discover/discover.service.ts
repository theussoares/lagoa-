import { Inject, Injectable, Logger } from '@nestjs/common'
import { DISCOVER_SHOPS_LIMIT, FEATURED_CAROUSEL_MAX } from '#shared/constants/domain'
import type { Challenge } from '#shared/schemas/discover'
import type { FeaturedShop } from '#shared/schemas/showcase'
import type { ShopSummary } from '#shared/schemas/shop'
import { ok, type Result } from '#shared/types/result'
import { localDateParts } from '#shared/utils/time'
import { Clock } from '../../common/clock'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { toShopSummary } from '../../shops/shop-summary.mapper'
import { DiscoverRepository } from './discover.repository'

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name)

  constructor(
    private readonly repository: DiscoverRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
    private readonly clock: Clock,
  ) {}

  async listShops(): Promise<Result<ShopSummary[], never>> {
    const shops = await this.repository.listApprovedShops(DISCOVER_SHOPS_LIMIT)
    const now = this.clock.now()
    return ok(
      shops.flatMap((shop) => {
        const summary = toShopSummary(shop, this.env.SUPABASE_URL, now)
        if (summary.ok) return [summary.value]
        this.logger.warn(`Shop ${shop.id} skipped: summary breaks the contract`)
        return []
      }),
    )
  }

  /** Carrossel do Descobrir: pagos primeiro, depois as lojas Pro; no máximo `FEATURED_CAROUSEL_MAX`. */
  async listFeatured(): Promise<Result<FeaturedShop[], never>> {
    const now = this.clock.now()
    const featured = await this.repository.listFeaturedShops(now, localDateParts(now).isoDate, FEATURED_CAROUSEL_MAX)
    const shops = featured.flatMap(({ shop, sponsored }) => {
      const summary = toShopSummary(shop, this.env.SUPABASE_URL, now)
      if (summary.ok) return [{ ...summary.value, sponsored }]
      this.logger.warn(`Shop ${shop.id} skipped: summary breaks the contract`)
      return []
    })
    return ok(shops.slice(0, FEATURED_CAROUSEL_MAX))
  }

  /** Desafios da cidade estão fora do MVP (`docs/database-model.md`): a lista é sempre vazia. */
  async listChallenges(): Promise<Result<Challenge[], never>> {
    return ok([])
  }
}
