import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { isLapsedSince } from '#shared/domain/customer'
import { isVisitKind } from '#shared/domain/ledger'
import { summarizeWeek } from '#shared/domain/weekSummary'
import { isRewardReady } from '#shared/domain/loyaltyCard'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { CustomerFilter, MerchantCustomerRow } from '#shared/schemas/customer'
import type { ShopId } from '#shared/schemas/ids'
import type { LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { maskPhone } from '#shared/utils/phone'
import { addDays, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { findCustomer, findProgram } from './queries'
import { cancelActiveVisitQrs } from './visitQr'

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
        (record) => record.shopId === shopId && record.customerId === customer.id && isVisitKind(record.kind),
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
          isLapsed: isLapsedSince(card.lastVisitAt, ctx.now),
          acceptsNotifications: customer.consent.notifications,
        },
      ]
    })
    .filter(filters[filter])
    .toSorted((a, b) => (b.lastVisitAt ?? '').localeCompare(a.lastVisitAt ?? ''))
}

export function weekSummary(ctx: MockContext, shopId: ShopId): WeekSummary {
  return summarizeWeek(
    ctx.state.ledger.filter((record) => record.shopId === shopId),
    ctx.now,
  )
}

export function countActiveCards(ctx: MockContext, shopId: ShopId): number {
  return ctx.state.cards.filter((card) => card.shopId === shopId).length
}

/**
 * A meta nova vale para os cartões em andamento, mas ninguém perde o que já
 * juntou: prêmio já liberado continua com a meta e o prêmio de antes.
 */
function retarget(ctx: MockContext, card: LoyaltyCard, program: Program): LoyaltyCard {
  if (isRewardReady(card)) return card
  const next = { ...card, target: program.rules.target, rewardTitle: program.reward.title }
  // Baixar a meta pode liberar o prêmio agora: a guarda de 30 dias começa hoje.
  return isRewardReady(next) ? { ...next, rewardExpiresAt: toIso(addDays(ctx.now, REWARD_HOLD_DAYS)) } : next
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
  ctx.state.cards = ctx.state.cards.map((card) => (card.shopId === shopId ? retarget(ctx, card, next) : card))
  cancelActiveVisitQrs(ctx, shopId)
  return ok(next)
}
