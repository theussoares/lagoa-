import { HIT_ITEMS_MAX_FOUNDER, HIT_ITEMS_MAX_FOUNDER_PRO } from '#shared/constants/domain'
import type { HitItemReview } from '#shared/schemas/admin'
import type { HitItemStatus } from '#shared/schemas/hitItem'
import type { ShopPlan, ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import { err, ok } from '#shared/types/result'

const CAP_BY_PLAN: Record<ShopPlan, number> = {
  founder: HIT_ITEMS_MAX_FOUNDER,
  founderPro: HIT_ITEMS_MAX_FOUNDER_PRO,
}

interface ItemSnapshot {
  readonly status: HitItemStatus
  readonly version: number
}

export function hitItemCap(plan: ShopPlan): number {
  return CAP_BY_PLAN[plan]
}

/** Qualquer edição do lojista volta o item para a fila; a versão nova barra aprovação de tela velha. */
export function planMerchantEdit(current: ItemSnapshot): { status: 'pending'; version: number } {
  return { status: 'pending', version: current.version + 1 }
}

/** `activeCount` conta os não arquivados. Plano rebaixado com itens acima do teto só perde o direito de criar mais. */
export function canCreateOrUnarchive(input: { plan: ShopPlan; activeCount: number }): Result<void, ErrorOf<'limitReached'>> {
  if (input.activeCount >= hitItemCap(input.plan)) return err({ code: 'limitReached' })
  return ok(undefined)
}

type ReviewDecision = { to: HitItemStatus; reason: string | null }
type ReviewError = ErrorOf<'conflict'> | ErrorOf<'invalidTransition'>

export function planReview(current: ItemSnapshot, review: HitItemReview): Result<ReviewDecision, ReviewError> {
  switch (review.action) {
    case 'approve':
      if (current.status !== 'pending') return err({ code: 'invalidTransition' })
      if (review.expectedVersion !== current.version) return err({ code: 'conflict' })
      return ok({ to: 'approved', reason: null })
    case 'reject':
      if (current.status !== 'pending') return err({ code: 'invalidTransition' })
      if (review.expectedVersion !== current.version) return err({ code: 'conflict' })
      return ok({ to: 'rejected', reason: review.reason })
    case 'takeDown':
      if (current.status !== 'approved') return err({ code: 'invalidTransition' })
      return ok({ to: 'rejected', reason: review.reason })
  }
}

export function isOnShowcase(input: { status: HitItemStatus; endsAt: Date | null; shopStatus: ShopStatus }, now: Date): boolean {
  if (input.status !== 'approved' || input.shopStatus !== 'approved') return false
  return input.endsAt === null || input.endsAt.getTime() > now.getTime()
}
