import type { LoyaltyCardId, RedemptionId } from '#shared/schemas/ids'
import { RedemptionSchema } from '#shared/schemas/redemption'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { RewardRedemptionService } from '../RewardRedemptionService'

export class HttpRewardRedemptionService implements RewardRedemptionService {
  constructor(private readonly api: ApiClient) {}

  async requestCode(cardId: LoyaltyCardId) {
    const result = await this.api.post('/redemptions', RedemptionSchema, { body: { cardId } })
    return allowing('notFound', 'rewardNotReady', 'termsNotAccepted')(result)
  }

  async getRedemption(id: RedemptionId) {
    return allowing('notFound')(await this.api.get(`/redemptions/${id}`, RedemptionSchema))
  }
}
