import type { AdminShopAction } from '#shared/schemas/admin'
import type { ShopPlan, ShopStatus } from '#shared/schemas/shop'

export interface ShopActionPlan {
  readonly status?: ShopStatus
  readonly plan?: ShopPlan
  readonly reason?: string
  /** Situações em que a ação vale; o repository confere sob o lock da loja. `undefined` = qualquer uma. */
  readonly allowedFrom?: readonly ShopStatus[]
}

/** O que cada ação do admin muda e de onde ela parte. Trocar para o plano que a loja já tem cai em "nada a mudar" no repository. */
export function planShopAction(action: AdminShopAction): ShopActionPlan {
  switch (action.action) {
    case 'approve':
      return { status: 'approved', allowedFrom: ['pending'] }
    case 'suspend':
      return { status: 'suspended', reason: action.reason, allowedFrom: ['pending', 'approved'] }
    case 'reactivate':
      return { status: 'approved', allowedFrom: ['suspended'] }
    case 'changePlan':
      return { plan: action.plan }
  }
}

/** Pendentes primeiro (0), o resto depois (1). */
export type ShopRank = 0 | 1

export const rankOf = (status: ShopStatus): ShopRank => (status === 'pending' ? 0 : 1)

export interface ShopCursor {
  readonly rank: ShopRank
  readonly id: string
}

export const encodeCursor = (cursor: ShopCursor): string => `${cursor.rank}:${cursor.id}`

/** O formato já passou pelo `AdminShopCursorSchema`. */
export function decodeCursor(raw: string): ShopCursor {
  const [rank, id = ''] = raw.split(':')
  return { rank: rank === '0' ? 0 : 1, id }
}

/** Pede uma linha a mais que a página: se vier, há próxima página e o cursor é a última loja mostrada. */
export function pageOf<Row extends { readonly id: string; readonly status: ShopStatus }>(
  rows: readonly Row[],
  pageSize: number,
): { readonly items: Row[]; readonly nextCursor: string | null } {
  if (rows.length <= pageSize) return { items: [...rows], nextCursor: null }
  const items = rows.slice(0, pageSize)
  const last = items[items.length - 1]
  return { items, nextCursor: last === undefined ? null : encodeCursor({ rank: rankOf(last.status), id: last.id }) }
}
