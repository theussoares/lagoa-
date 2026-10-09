import type { ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

export type ShopClosedError = ErrorOf<'shopPendingApproval' | 'shopSuspended'>

export function assertOperationalShop(status: ShopStatus): Result<void, ShopClosedError> {
  if (status === 'pending') return err({ code: 'shopPendingApproval' })
  if (status === 'suspended') return err({ code: 'shopSuspended' })
  return ok(undefined)
}
