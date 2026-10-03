import { welcomeUnits } from '#shared/domain/bonusRules'
import { planEarning } from '#shared/domain/earning'
import { addUnits, isRewardReady } from '#shared/domain/loyaltyCard'
import type { EarnError, EarnInput } from '#shared/domain/programStrategies'
import { VisitIdSchema } from '#shared/schemas/ids'
import type { EarnSource, LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program } from '#shared/schemas/program'
import type { CounterEntry, WalletActivity } from '#shared/schemas/visit'
import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addDays, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { findCard, findShop, maskedPhoneOf, newCard, replaceCard } from './queries'
import type { CustomerRecord, LedgerRecord } from '../state'

export function visitUnits(
  ctx: MockContext,
  customer: CustomerRecord,
  program: Program,
  input: EarnInput,
): Result<number, EarnError> {
  // Mesma conta do servidor (`planEarning`); as boas-vindas do cartão novo o mock aplica em `creditCard`.
  const plan = planEarning({
    rules: program.rules,
    bonusRules: program.bonusRules,
    customerBirthday: customer.birthday,
    card: null,
    input,
    now: ctx.now,
  })
  return plan.ok ? ok(plan.value.units) : plan
}

/** Credita unidades no cartão (criando-o com boas-vindas se for o primeiro). */
export function creditCard(
  ctx: MockContext,
  customer: CustomerRecord,
  program: Program,
  units: number,
  source: EarnSource,
): { card: LoyaltyCard; welcomeUnits: number } {
  const nowIso = toIso(ctx.now)
  const existing = findCard(ctx, customer.id, program.shopId)
  const welcome = existing === undefined ? welcomeUnits(program.bonusRules) : 0
  const start = existing ?? newCard(ctx, customer.id, program)
  const welcomed = welcome > 0 ? addUnits(start, welcome, 'welcomeBonus', nowIso) : start
  const credited = addUnits(welcomed, units, source, nowIso)
  const card: LoyaltyCard = { ...holdRewardIfReady(ctx, credited), lastVisitAt: nowIso }
  replaceCard(ctx, card)
  return { card, welcomeUnits: welcome }
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
