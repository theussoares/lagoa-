import { Controller, Get } from '@nestjs/common'
import type { Challenge } from '#shared/schemas/discover'
import type { ShopSummary } from '#shared/schemas/shop'
import { unwrap } from '../../common/http/domain-exception'
import { DiscoverService } from './discover.service'

@Controller('discover')
export class DiscoverController {
  constructor(private readonly discover: DiscoverService) {}

  @Get('shops')
  async listShops(): Promise<ShopSummary[]> {
    return unwrap(await this.discover.listShops())
  }

  @Get('challenges')
  async listChallenges(): Promise<Challenge[]> {
    return unwrap(await this.discover.listChallenges())
  }
}
