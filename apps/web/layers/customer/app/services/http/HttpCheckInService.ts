import { CheckInResultSchema } from '#shared/schemas/visit'
import { ShopJoinResultSchema } from '#shared/schemas/shop'
import type { CheckInCode } from '#shared/schemas/shop'
import type { VisitQrCredential } from '#shared/schemas/visitQr'
import { allowing, type ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { CheckInService } from '../CheckInService'

export class HttpCheckInService implements CheckInService {
  /** `newIdempotencyKey` vem de fora (precisa de `crypto`, API de navegador): uma chave nova por toque. */
  constructor(
    private readonly api: ApiClient,
    private readonly newIdempotencyKey: () => string,
  ) {}

  async joinShop(code: CheckInCode) {
    const result = await this.api.post('/shop-join', ShopJoinResultSchema, { body: { code } })
    return allowing('invalidShopQr', 'checkInDisabled', 'termsNotAccepted')(result)
  }

  /** O token vai no corpo, nunca em URL ou query; o código curto tem rota própria (limite de tentativas no servidor). */
  async claimVisitQr(credential: VisitQrCredential) {
    const [path, body] =
      credential.kind === 'token'
        ? (['/check-in', { token: credential.token }] as const)
        : (['/check-in/code', { visitCode: credential.code }] as const)
    const result = await this.api.post(path, CheckInResultSchema, {
      body,
      headers: { 'idempotency-key': this.newIdempotencyKey() },
    })
    return allowing('invalidVisitQr', 'visitQrExpired', 'visitQrAlreadyUsed', 'visitQrStale', 'checkInCooldown', 'termsNotAccepted')(result)
  }
}
