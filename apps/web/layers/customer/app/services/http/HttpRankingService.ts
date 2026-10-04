import { RankingSchema, type RankingConsentUpdate } from '#shared/schemas/ranking'
import { transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { RankingService } from '../RankingService'

export class HttpRankingService implements RankingService {
  constructor(private readonly api: ApiClient) {}

  async getRanking() {
    return transportOnly(await this.api.get('/customer/ranking', RankingSchema))
  }

  async setConsent(update: RankingConsentUpdate) {
    return transportOnly(await this.api.put('/customer/ranking/consent', RankingSchema, { body: update }))
  }
}
