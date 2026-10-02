import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import { isRewardReady } from '#shared/domain/loyaltyCard'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { CustomerFilter, MerchantCustomerRow } from '#shared/schemas/customer'
import type { ShopId } from '#shared/schemas/ids'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { maskPhone } from '#shared/utils/phone'
import { daysBetween } from '#shared/utils/time'
import type { MockContext } from './context'
import { findCustomer, findProgram } from './queries'

const filters: Readonly<Record<CustomerFilter, (row: MerchantCustomerRow) => boolean>> = {
  all: () => true,
  lapsed: (row) => row.isLapsed,
  rewardReady: (row) => isRewardReady(row),
}

export function merchantCustomers(ctx: MockContext, shopId: ShopId, filter: CustomerFilter): MerchantCustomerRow[] {
  return ctx.state.cards
    .filter((card) => card.shopId === shopId)
    .flatMap((card): MerchantCustomerRow[] => {
      const customer = findCustomer(ctx, card.customerId)
      if (customer === undefined) return []
      const visitsCount = ctx.state.ledger.filter(
        (record) => record.shopId === shopId && record.customerId === customer.id && record.kind !== 'redemption',
      ).length
      return [
        {
          customerId: customer.id,
          maskedPhone: maskPhone(customer.phone),
          firstName: customer.firstName,
          unit: card.unit,
          balance: card.balance,
          target: card.target,
          visitsCount,
          lastVisitAt: card.lastVisitAt,
          isLapsed: card.lastVisitAt !== null && daysBetween(new Date(card.lastVisitAt), ctx.now) > LAPSED_AFTER_DAYS,
          acceptsNotifications: customer.consent.notifications,
        },
      ]
    })
    .filter(filters[filter])
    .toSorted((a, b) => (b.lastVisitAt ?? '').localeCompare(a.lastVisitAt ?? ''))
}

export function countActiveCards(ctx: MockContext, shopId: ShopId): number {
  return ctx.state.cards.filter((card) => card.shopId === shopId).length
}

export function getProgram(ctx: MockContext, shopId: ShopId): Result<Program, ErrorOf<'unauthorized'>> {
  const program = findProgram(ctx, shopId)
  return program === undefined ? err({ code: 'unauthorized' }) : ok(program)
}

/**
 * Mudar o alvo vale para cartões novos e para os em andamento; o saldo
 * acumulado do cliente nunca é reduzido.
 */
export function updateProgram(
  ctx: MockContext,
  shopId: ShopId,
  draft: ProgramDraft,
): Result<Program, ErrorOf<'invalidProgram' | 'programModeLocked' | 'unauthorized'>> {
  const current = findProgram(ctx, shopId)
  if (current === undefined) return err({ code: 'unauthorized' })
  const parsed = ProgramDraftSchema.safeParse(draft)
  if (!parsed.success) return err({ code: 'invalidProgram' })
  if (parsed.data.rules.mode !== current.rules.mode && countActiveCards(ctx, shopId) > 0) {
    return err({ code: 'programModeLocked' })
  }
  const next: Program = { ...current, ...parsed.data }
  ctx.state.programs = ctx.state.programs.map((program) => (program.shopId === shopId ? next : program))
  ctx.state.cards = ctx.state.cards.map((card) =>
    card.shopId === shopId ? { ...card, target: next.rules.target, rewardTitle: next.reward.title } : card,
  )
  return ok(next)
}
