import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import { HomeOverviewSchema } from '#shared/schemas/homeOverview'
import { WeekSummarySchema } from '#shared/schemas/weekSummary'
import type { MerchantHomeService } from '../MerchantHomeService'

export class HttpMerchantHomeService implements MerchantHomeService {
  constructor(private readonly api: ApiClient) {}

  async getWeekSummary() {
    return transportOnly(await this.api.get('/merchant/home/summary', WeekSummarySchema))
  }

  async getOverview() {
    return transportOnly(await this.api.get('/merchant/home/overview', HomeOverviewSchema))
  }
}
