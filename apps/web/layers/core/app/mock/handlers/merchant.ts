import { HOME_ACTIVITY_LIMIT, MERCHANT_CUSTOMERS_PAGE_SIZE, REWARD_HOLD_DAYS } from '#shared/constants/domain'
import { isLapsedSince, lapsedCutoff } from '#shared/domain/customer'
import { isVisitKind } from '#shared/domain/ledger'
import { summarizeComparison } from '#shared/domain/homeComparison'
import { summarizeWeek } from '#shared/domain/weekSummary'
import { isNearReward, isRewardReady } from '#shared/domain/loyaltyCard'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { CustomerFilter, MerchantCustomerPage, MerchantCustomerRow } from '#shared/schemas/customer'
import type { CustomerId, ShopId } from '#shared/schemas/ids'
import type { LoyaltyCard } from '#shared/schemas/loyaltyCard'
import type { Program, ProgramDraft } from '#shared/schemas/program'
import type { HomeActivityItem, HomeActivityKind, HomeOverview } from '#shared/schemas/homeOverview'
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
  nearReward: (row) => isNearReward(row),
  rewardReady: (row) => isRewardReady(row),
}

function lastAmountOf(ctx: MockContext, shopId: ShopId, customerId: CustomerId): number | null {
  const purchases = ctx.state.ledger.filter((record) => record.shopId === shopId && record.customerId === customerId && record.amountCents !== null)
  return purchases.toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.amountCents ?? null
}

function merchantCustomers(ctx: MockContext, shopId: ShopId, filter: CustomerFilter): MerchantCustomerRow[] {
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
          lastAmountCents: lastAmountOf(ctx, shopId, customer.id),
        },
      ]
    })
    .filter(filters[filter])
    .toSorted((a, b) => (b.lastVisitAt ?? '').localeCompare(a.lastVisitAt ?? ''))
}

/** Mesmo contrato da API: página de MERCHANT_CUSTOMERS_PAGE_SIZE, cursor no último cliente mostrado e contagem do filtro inteiro. */
export function merchantCustomerPage(ctx: MockContext, shopId: ShopId, filter: CustomerFilter, cursor: CustomerId | null): MerchantCustomerPage {
  const rows = merchantCustomers(ctx, shopId, filter)
  const start = cursor === null ? 0 : rows.findIndex((row) => row.customerId === cursor) + 1
  const items = start === 0 && cursor !== null ? [] : rows.slice(start, start + MERCHANT_CUSTOMERS_PAGE_SIZE)
  const hasMore = items.length > 0 && start + items.length < rows.length
  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.customerId ?? null) : null,
    total: rows.length,
    acceptingNotifications: rows.filter((row) => row.acceptsNotifications).length,
  }
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
): Result<Program, ErrorOf<'invalidProgram' | 'unauthorized'>> {
  const current = findProgram(ctx, shopId)
  if (current === undefined) return err({ code: 'unauthorized' })
  const parsed = ProgramDraftSchema.safeParse(draft)
  if (!parsed.success) return err({ code: 'invalidProgram' })
  const next: Program = { ...current, ...parsed.data }
  ctx.state.programs = ctx.state.programs.map((program) => (program.shopId === shopId ? next : program))
  ctx.state.cards = ctx.state.cards.map((card) => (card.shopId === shopId ? retarget(ctx, card, next) : card))
  cancelActiveVisitQrs(ctx, shopId)
  return ok(next)
}

export function homeOverview(ctx: MockContext, shopId: ShopId): HomeOverview {
  const shopCards = ctx.state.cards.filter((card) => card.shopId === shopId)
  const shopLedger = ctx.state.ledger.filter((entry) => entry.shopId === shopId)
  const shopRedemptions = ctx.state.redemptions.filter((redemption) => redemption.shopId === shopId && redemption.status === 'active')
  const program = findProgram(ctx, shopId)
  const target = program?.rules.target ?? 10
  const unit = program?.rules.mode === 'stamps' ? 'stamp' : 'point'

  const lapsedCards = shopCards.filter((card) => isLapsedSince(card.lastVisitAt, ctx.now))
  const oldestLapsedCard = [...lapsedCards]
    .filter((c) => c.lastVisitAt !== null)
    .sort((a, b) => (a.lastVisitAt ?? '').localeCompare(b.lastVisitAt ?? ''))[0]

  const nearRewardCards = shopCards.filter((card) => isNearReward(card))
  const rewardReadyCards = shopCards.filter((card) => isRewardReady(card))

  const newCustomersRecords = shopCards.map((c) => ({
    customerId: c.customerId,
    createdAt: findCustomer(ctx, c.customerId)?.createdAt ?? toIso(ctx.now),
  }))
  const comparison = summarizeComparison(shopLedger, newCustomersRecords, ctx.now)

  const items: HomeActivityItem[] = []
  for (const entry of shopLedger) {
    const customer = findCustomer(ctx, entry.customerId)
    let kind: HomeActivityKind = 'visit'
    if (entry.kind === 'redemption') {
      kind = 'redemption'
    } else if (entry.amountCents && entry.amountCents > 0) {
      kind = 'purchase'
    } else if (entry.kind === 'welcomeBonus' || entry.kind === 'referralBonus' || entry.kind === 'campaignBonus') {
      kind = 'bonus'
    }
    items.push({
      id: `ledger_${entry.id}`,
      kind,
      customerId: entry.customerId,
      name: customer?.firstName ?? null,
      maskedPhone: customer ? maskPhone(customer.phone) : null,
      units: entry.units,
      unit: entry.unit,
      amountCents: entry.amountCents,
      rewardTitle: entry.rewardTitle,
      createdAt: entry.createdAt,
    })
  }

  for (const redemption of shopRedemptions) {
    const customer = findCustomer(ctx, redemption.customerId)
    const card = ctx.state.cards.find((c) => c.id === redemption.cardId)
    items.push({
      id: `redemption_${redemption.id}`,
      kind: 'rewardReleased',
      customerId: redemption.customerId,
      name: customer?.firstName ?? null,
      maskedPhone: customer ? maskPhone(customer.phone) : null,
      units: card?.target ?? target,
      unit: card?.unit ?? unit,
      amountCents: null,
      rewardTitle: redemption.rewardTitle,
      createdAt: redemption.createdAt,
    })
  }

  const activity = items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, HOME_ACTIVITY_LIMIT)

  return {
    lapsed: {
      total: lapsedCards.length,
      oldestLastVisitAt: oldestLapsedCard?.lastVisitAt ?? null,
    },
    nearReward: {
      total: nearRewardCards.length,
    },
    rewardReady: {
      total: rewardReadyCards.length,
    },
    totalCustomers: shopCards.length,
    comparison,
    activity,
  }
}
