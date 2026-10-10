import type { ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

/** Só loja aprovada mexe com cliente (QR, resgate, campanha); pendente e suspensa só leem. */
export function requireOperational(status: ShopStatus): Result<void, ErrorOf<'shopPendingApproval' | 'shopSuspended'>> {
  if (status === 'pending') return err({ code: 'shopPendingApproval' })
  if (status === 'suspended') return err({ code: 'shopSuspended' })
  return ok(undefined)
}
