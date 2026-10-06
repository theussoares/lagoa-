import type { CustomerId, MerchantId, ShopId } from '#shared/schemas/ids'
import type { ErrorOf } from '#shared/types/errors'
import { err } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { CustomerSessionProvider, MerchantSessionProvider } from '../services/SessionProvider'
import type { MockContext } from './handlers/context'
import type { MockBackend } from './MockBackend'

type Unauthorized = ErrorOf<'unauthorized'>

export function asCustomer<T, E>(
  backend: MockBackend,
  sessions: CustomerSessionProvider,
  handler: (ctx: MockContext, customerId: CustomerId) => Result<T, E>,
): Promise<Result<T, E | Unauthorized>> {
  const session = sessions.current()
  if (session === null) return Promise.resolve(err({ code: 'unauthorized' }))
  return backend.run((ctx) => handler(ctx, session.customerId))
}

export function asMerchant<T, E>(
  backend: MockBackend,
  sessions: MerchantSessionProvider,
  handler: (ctx: MockContext, shopId: ShopId, merchantId: MerchantId) => Result<T, E>,
): Promise<Result<T, E | Unauthorized>> {
  const session = sessions.current()
  if (session === null) return Promise.resolve(err({ code: 'unauthorized' }))
  return backend.run((ctx) => handler(ctx, session.shopId, session.merchantId))
}
