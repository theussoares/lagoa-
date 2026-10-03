import { Inject, Injectable, Logger } from '@nestjs/common'
import { DISCOVER_SHOPS_LIMIT } from '#shared/constants/domain'
import type { Challenge } from '#shared/schemas/discover'
import type { ShopSummary } from '#shared/schemas/shop'
import { ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { toShopSummary } from './discover.mapper'
import { DiscoverRepository } from './discover.repository'

@Injectable()
export class DiscoverService {
  private readonly logger = new Logger(DiscoverService.name)

  constructor(
    private readonly repository: DiscoverRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
  ) {}

  async listShops(): Promise<Result<ShopSummary[], never>> {
    const shops = await this.repository.listApprovedShops(DISCOVER_SHOPS_LIMIT)
    return ok(
      shops.flatMap((shop) => {
        const summary = toShopSummary(shop, this.env.SUPABASE_URL)
        if (summary.ok) return [summary.value]
        this.logger.warn(`Shop ${shop.id} skipped: summary breaks the contract`)
        return []
      }),
    )
  }

  /** Desafios da cidade estão fora do MVP (`docs/database-model.md`): a lista é sempre vazia. */
  async listChallenges(): Promise<Result<Challenge[], never>> {
    return ok([])
  }
}
