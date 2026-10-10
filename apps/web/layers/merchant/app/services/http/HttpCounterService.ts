import { z } from 'zod'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { RedemptionId } from '#shared/schemas/ids'
import type { RedemptionCode } from '#shared/schemas/redemption'
import { RedemptionPreviewSchema } from '#shared/schemas/redemption'
import { CounterEntrySchema, CounterTodaySchema } from '#shared/schemas/visit'
import type { CounterService } from '../CounterService'

export class HttpCounterService implements CounterService {
  constructor(private readonly api: ApiClient) {}

  async validateRedemption(code: RedemptionCode) {
    const res = await this.api.post('/merchant/counter/redemptions/validate', RedemptionPreviewSchema, { body: { code } })
    return allowing('redemptionInvalid', 'redemptionExpired', 'redemptionAlreadyUsed', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async confirmRedemption(id: RedemptionId) {
    const res = await this.api.post(`/merchant/counter/redemptions/${id}/confirm`, CounterEntrySchema, { body: {} })
    return allowing('redemptionInvalid', 'redemptionExpired', 'redemptionAlreadyUsed', 'rewardNotReady', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async listTodayEntries() {
    return transportOnly(await this.api.get('/merchant/counter/entries/today', CounterTodaySchema))
  }
}
