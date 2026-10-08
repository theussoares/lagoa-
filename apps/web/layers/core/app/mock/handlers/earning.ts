import type { EarningPlan } from '#shared/domain/earning'
import { addUnits, isRewardReady } from '#shared/domain/loyaltyCard'
import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { VisitIdSchema } from '#shared/schemas/ids'
import type { EarnSource, LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program } from '#shared/schemas/program'
import type { CounterEntry, WalletActivity } from '#shared/schemas/visit'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addDays, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { findCard, findShop, maskedPhoneOf, newCard, replaceCard } from './queries'
import type { CustomerRecord, LedgerRecord } from '../state'

/** Aplica no cartão o plano inteiro de `planEarning` (boas-vindas, unidades, prazo do prêmio): o mock não refaz a conta. */
export function applyEarningPlan(
  ctx: MockContext,
  customer: CustomerRecord,
  program: Program,
  plan: EarningPlan,
  source: EarnSource,
): LoyaltyCard {
  const nowIso = toIso(ctx.now)
  const start = findCard(ctx, customer.id, program.shopId) ?? newCard(ctx, customer.id, program)
  const welcomed = plan.welcomeUnits > 0 ? addUnits(start, plan.welcomeUnits, 'welcomeBonus', nowIso) : start
  const credited = addUnits(welcomed, plan.units, source, nowIso)
  const card: LoyaltyCard = {
    ...credited,
    balance: plan.balanceAfter,
    rewardExpiresAt: plan.rewardExpiresAt === null ? null : toIso(plan.rewardExpiresAt),
    lastVisitAt: nowIso,
  }
  replaceCard(ctx, card)
  return card
}

/** Prêmio que acabou de liberar fica guardado REWARD_HOLD_DAYS a partir de agora. */
export function holdRewardIfReady(ctx: MockContext, card: LoyaltyCard): LoyaltyCard {
  if (card.rewardExpiresAt !== null || !isRewardReady(card)) return card
  return { ...card, rewardExpiresAt: toIso(addDays(ctx.now, REWARD_HOLD_DAYS)) }
}

export function appendLedger(ctx: MockContext, record: Omit<LedgerRecord, 'id' | 'createdAt'>): LedgerRecord {
  const entry: LedgerRecord = {
    ...record,
    id: VisitIdSchema.parse(ctx.ids.next('visit')),
    createdAt: toIso(ctx.now),
  }
  ctx.state.ledger.push(entry)
  return entry
}

export function toCounterEntry(ctx: MockContext, record: LedgerRecord): Result<CounterEntry, { code: 'notFound' }> {
  const maskedPhone = maskedPhoneOf(ctx, record.customerId)
  if (maskedPhone === undefined) return err({ code: 'notFound' })
  return ok({
    id: record.id,
    shopId: record.shopId,
    maskedPhone,
    kind: record.kind,
    unit: record.unit,
    units: record.units,
    amountCents: record.amountCents,
    rewardTitle: record.rewardTitle,
    isNewCustomer: record.isNewCustomer,
    createdAt: record.createdAt,
  })
}

export function toWalletActivity(ctx: MockContext, record: LedgerRecord): WalletActivity {
  return {
    id: record.id,
    shopId: record.shopId,
    shopName: findShop(ctx, record.shopId)?.name ?? '',
    kind: record.kind,
    unit: record.unit,
    units: record.units,
    rewardTitle: record.rewardTitle,
    createdAt: record.createdAt,
  }
}
