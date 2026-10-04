import { CheckInResultSchema } from '#shared/schemas/visit'
import type { CheckInCode } from '#shared/schemas/shop'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { CheckInService } from '../CheckInService'

export class HttpCheckInService implements CheckInService {
  /** `newIdempotencyKey` vem de fora (precisa de `crypto`, API de navegador): uma chave nova por toque. */
  constructor(
    private readonly api: ApiClient,
    private readonly newIdempotencyKey: () => string,
  ) {}

  async checkIn(code: CheckInCode) {
    const result = await this.api.post('/check-in', CheckInResultSchema, {
      body: { code },
      headers: { 'idempotency-key': this.newIdempotencyKey() },
    })
    return allowing('invalidShopQr', 'checkInDisabled', 'checkInCooldown', 'termsNotAccepted')(result)
  }
}
