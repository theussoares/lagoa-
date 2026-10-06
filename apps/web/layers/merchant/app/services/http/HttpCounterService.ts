import { z } from 'zod'
import { allowing, transportOnly, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { RedemptionId } from '#shared/schemas/ids'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { RedemptionCode } from '#shared/schemas/redemption'
import { RedemptionPreviewSchema } from '#shared/schemas/redemption'
import { CounterEntrySchema, VisitRegisteredSchema } from '#shared/schemas/visit'
import type { CounterService } from '../CounterService'

export class HttpCounterService implements CounterService {
  constructor(private readonly api: ApiClient) {}

  async registerVisit(phone: PhoneNumber) {
    const res = await this.api.post('/merchant/counter/visits', VisitRegisteredSchema, { body: { phone } })
    return allowing('invalidAmount', 'amountNotAccepted', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async registerAmount(phone: PhoneNumber, amountCents: number) {
    const res = await this.api.post('/merchant/counter/amount', VisitRegisteredSchema, { body: { phone, amountCents } })
    return allowing('invalidAmount', 'amountNotAccepted', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async validateRedemption(code: RedemptionCode) {
    const res = await this.api.post('/merchant/counter/redemptions/validate', RedemptionPreviewSchema, { body: { code } })
    return allowing('redemptionInvalid', 'redemptionExpired', 'redemptionAlreadyUsed', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async confirmRedemption(id: RedemptionId) {
    const res = await this.api.post(`/merchant/counter/redemptions/${id}/confirm`, CounterEntrySchema, { body: {} })
    return allowing('redemptionInvalid', 'redemptionExpired', 'redemptionAlreadyUsed', 'shopPendingApproval', 'shopSuspended')(res)
  }

  async listTodayEntries() {
    return transportOnly(await this.api.get('/merchant/counter/entries/today', z.array(CounterEntrySchema)))
  }
}
