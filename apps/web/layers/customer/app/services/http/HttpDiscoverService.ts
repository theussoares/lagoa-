import { z } from 'zod'
import { ChallengeSchema } from '#shared/schemas/discover'
import { ShopSummarySchema } from '#shared/schemas/shop'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { DiscoverService } from '../DiscoverService'

export class HttpDiscoverService implements DiscoverService {
  constructor(private readonly api: ApiClient) {}

  async listShops() {
    return transportOnly(await this.api.get('/discover/shops', z.array(ShopSummarySchema)))
  }

  async listChallenges() {
    return transportOnly(await this.api.get('/discover/challenges', z.array(ChallengeSchema)))
  }
}
