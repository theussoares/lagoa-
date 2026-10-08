import type { VisitQrEarn } from '#shared/schemas/visitQr'
import type { CheckInService } from '../customer/check-in/check-in.service'
import type { TestDatabase, TestShop } from './test-database'

/** Uma visita do jeito de hoje: o lojista emite o QR (direto no banco) e o cliente o usa. */
export async function claimVisit(
  data: TestDatabase,
  service: CheckInService,
  customerId: string,
  shop: TestShop,
  options: { earn?: VisitQrEarn } = {},
): ReturnType<CheckInService['claimVisitQr']> {
  const qr = await data.createVisitQr({ shopId: shop.id, ...(options.earn && { earn: options.earn }) })
  return service.claimVisitQr(customerId, { token: qr.token })
}
