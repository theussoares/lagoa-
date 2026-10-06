import type { MockBackend } from '#layers/core/app/mock/MockBackend'
import { claimVisitQr } from '#layers/core/app/mock/handlers/visitQrClaim'
import type { CustomerId } from '#shared/schemas/ids'
import type { CheckInResult } from '#shared/schemas/visit'
import type { MerchantServices } from '../app/services/MerchantServices'

/** Uma venda inteira no mock: o lojista gera o QR da visita e o cliente usa. */
export async function earnVisit(
  backend: MockBackend,
  merchant: MerchantServices,
  customerId: CustomerId,
  request: { amountCents?: number } = {},
): Promise<CheckInResult> {
  const issued = await merchant.visitQr.issueVisitQr(request)
  if (!issued.ok) throw new Error(issued.error.code)
  const claimed = await backend.run((ctx) => claimVisitQr(ctx, customerId, { kind: 'token', token: issued.value.token }))
  if (!claimed.ok) throw new Error(claimed.error.code)
  return claimed.value
}
