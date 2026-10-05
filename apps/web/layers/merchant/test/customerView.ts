import { ok } from '#shared/types/result'
import type { ShopId } from '#shared/schemas/ids'
import { asCustomer } from '#layers/core/app/mock/withSession'
import type { MockBackend } from '#layers/core/app/mock/MockBackend'
import { checkIn, walletActivity, walletCard } from '#layers/core/app/mock/handlers/wallet'
import { setNotificationConsent } from '#layers/core/app/mock/handlers/profile'
import type { CheckInCode } from '#shared/schemas/shop'
import type { CustomerSessionProvider } from '#layers/core/app/services/SessionProvider'

/** O que os testes do lojista precisam ver "do lado do cliente" no mock (o app do cliente já não usa o mock). */
export function customerView(backend: MockBackend, sessions: CustomerSessionProvider) {
  return {
    wallet: {
      getCard: (shopId: ShopId) => asCustomer(backend, sessions, (ctx, customerId) => walletCard(ctx, customerId, shopId)),
      listActivity: (limit: number) => asCustomer(backend, sessions, (ctx, customerId) => ok(walletActivity(ctx, customerId, limit))),
    },
    checkIn: { checkIn: (code: CheckInCode) => asCustomer(backend, sessions, (ctx, customerId) => checkIn(ctx, customerId, code)) },
    profile: {
      setNotificationConsent: (granted: boolean) =>
        asCustomer(backend, sessions, (ctx, customerId) => setNotificationConsent(ctx, customerId, granted)),
    },
  }
}
