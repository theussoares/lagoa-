import { applyVisitBonuses, welcomeUnits } from '#shared/domain/bonusRules'
import { addUnits, isRewardReady } from '#shared/domain/loyaltyCard'
import { baseUnitsFor } from '#shared/domain/programStrategies'
import type { EarnError, EarnInput } from '#shared/domain/programStrategies'
import { VisitIdSchema } from '#shared/schemas/ids'
import type { EarnSource, LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program } from '#shared/schemas/program'
import type { CounterEntry, WalletActivity } from '#shared/schemas/visit'
import { REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addDays, localDateParts, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { findCard, findShop, maskedPhoneOf, newCard, replaceCard } from './queries'
import type { CustomerRecord, LedgerRecord } from '../state'

export function visitUnits(
  ctx: MockContext,
  customer: CustomerRecord,
  program: Program,
  input: EarnInput,
): Result<number, EarnError> {
  const base = baseUnitsFor(program.rules, input)
  if (!base.ok) return base
  const today = localDateParts(ctx.now)
  const { units } = applyVisitBonuses(base.value, program.bonusRules, {
    today: { isoDate: today.isoDate, monthDay: today.monthDay },
    customerBirthday: customer.birthday,
  })
  return ok(units)
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
  const card: LoyaltyCard = {
    ...credited,
    lastVisitAt: nowIso,
    rewardExpiresAt:
      credited.rewardExpiresAt ?? (isRewardReady(credited) ? toIso(addDays(ctx.now, REWARD_HOLD_DAYS)) : null),
  }
  replaceCard(ctx, card)
  return { card, welcomeUnits: welcome }
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
