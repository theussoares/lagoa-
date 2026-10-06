import { sortByRewardProximity, toCardProgress } from '#shared/domain/loyaltyCard'
import { checkInAvailableAt } from '#shared/domain/antifraud'
import { isVisitKind } from '#shared/domain/ledger'
import type { Challenge } from '#shared/schemas/discover'
import type { CustomerId, ShopId } from '#shared/schemas/ids'
import type { LoyaltyCard, WalletCard } from '#shared/schemas/loyaltyCard'
import type { CheckInCode, ShopJoinResult, ShopSummary } from '#shared/schemas/shop'
import type { CheckInResult, WalletActivity } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { addHours, toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import type { LedgerRecord } from '../state'
import { toWalletActivity } from './earning'
import { findCard, findCustomer, findProgram, findShop, newCard, replaceCard, toShopSummary } from './queries'

function toWalletCard(ctx: MockContext, card: LoyaltyCard): WalletCard | undefined {
  const shop = findShop(ctx, card.shopId)
  const program = findProgram(ctx, card.shopId)
  if (shop === undefined || program === undefined) return undefined
  const { customerId: _customerId, ...rest } = card
  return { ...rest, shop: toShopSummary(shop, program) }
}

export function walletCards(ctx: MockContext, customerId: CustomerId): WalletCard[] {
  const cards = ctx.state.cards
    .filter((card) => card.customerId === customerId)
    .flatMap((card) => {
      const walletCard = toWalletCard(ctx, card)
      return walletCard === undefined ? [] : [walletCard]
    })
  return sortByRewardProximity(cards)
}

export function walletCard(
  ctx: MockContext,
  customerId: CustomerId,
  shopId: ShopId,
): Result<WalletCard, ErrorOf<'notFound'>> {
  const card = walletCards(ctx, customerId).find((item) => item.shopId === shopId)
  return card === undefined ? err({ code: 'notFound', entity: 'card' }) : ok(card)
}

export function walletActivity(ctx: MockContext, customerId: CustomerId, limit: number): WalletActivity[] {
  return customerLedger(ctx, customerId, () => true, limit)
}

export function rewardHistory(ctx: MockContext, customerId: CustomerId, limit: number): WalletActivity[] {
  return customerLedger(ctx, customerId, (record) => record.kind === 'redemption', limit)
}

function customerLedger(
  ctx: MockContext,
  customerId: CustomerId,
  include: (record: LedgerRecord) => boolean,
  limit: number,
): WalletActivity[] {
  return ctx.state.ledger
    .filter((record) => record.customerId === customerId && include(record))
    // Mais novo primeiro; no mesmo instante, o último lançado primeiro.
    .toReversed()
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map((record) => toWalletActivity(ctx, record))
}

type JoinError = ErrorOf<'invalidShopQr' | 'checkInDisabled' | 'unauthorized'>

/** Entrar no clube pelo cartaz: cartão zerado, sem ledger e sem janela antifraude; repetir devolve o mesmo cartão. */
export function joinShop(ctx: MockContext, customerId: CustomerId, code: CheckInCode): Result<ShopJoinResult, JoinError> {
  if (findCustomer(ctx, customerId) === undefined) return err({ code: 'unauthorized' })
  const shop = ctx.state.shops.find((item) => item.checkInCode === code && item.status === 'approved')
  const program = shop === undefined ? undefined : findProgram(ctx, shop.id)
  if (shop === undefined || program === undefined) return err({ code: 'invalidShopQr' })
  const existing = findCard(ctx, customerId, shop.id)
  if (existing !== undefined) return ok({ shopId: shop.id, cardId: existing.id, alreadyMember: true })
  if (!program.checkIn.enabled) return err({ code: 'checkInDisabled' })
  const card = newCard(ctx, customerId, program)
  replaceCard(ctx, card)
  return ok({ shopId: shop.id, cardId: card.id, alreadyMember: false })
}

export function discoverShops(ctx: MockContext): ShopSummary[] {
  return ctx.state.shops
    .filter((shop) => shop.status === 'approved')
    .flatMap((shop) => {
      const program = findProgram(ctx, shop.id)
      return program === undefined ? [] : [toShopSummary(shop, program)]
    })
}

export function discoverChallenges(ctx: MockContext, customerId: CustomerId): Challenge[] {
  return ctx.state.challenges.map((challenge) => {
    const visitedShopIds = challenge.shopIds.filter((shopId) =>
      ctx.state.ledger.some(
        (record) =>
          record.customerId === customerId &&
          record.shopId === shopId &&
          isVisitKind(record.kind) &&
          record.createdAt >= challenge.startsAt &&
          (challenge.endsAt === null || record.createdAt <= challenge.endsAt),
      ),
    )
    return { ...challenge, visitedShopIds }
  })
}

