import type { ShopId } from '#shared/schemas/ids'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import type { ShopRecord } from '../state'
import type { MockContext } from './context'
import { findShop } from './queries'

export type ShopAccessError = ErrorOf<'unauthorized' | 'shopPendingApproval' | 'shopSuspended'>

/**
 * Só loja aprovada mexe com cliente: lança visita, entrega prêmio, manda campanha.
 * Pendente e suspensa ainda leem o painel e o cartaz.
 */
export function requireOperationalShop(ctx: MockContext, shopId: ShopId): Result<ShopRecord, ShopAccessError> {
  const shop = findShop(ctx, shopId)
  if (shop === undefined) return err({ code: 'unauthorized' })
  if (shop.status === 'pending') return err({ code: 'shopPendingApproval' })
  if (shop.status === 'suspended') return err({ code: 'shopSuspended' })
  return ok(shop)
}
