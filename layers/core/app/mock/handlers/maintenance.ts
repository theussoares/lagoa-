import { consumeReward, isExpiredByInactivity } from '#shared/domain/loyaltyCard'
import type { MockContext } from './context'
import { findProgram } from './queries'

/**
 * O que no backend real seriam jobs: códigos vencem, prêmio guardado expira,
 * carimbos vencem por inatividade. No mock roda antes de cada chamada.
 */
export function runMaintenance(ctx: MockContext): void {
  expireRedemptions(ctx)
  expireCards(ctx)
}

function expireRedemptions(ctx: MockContext): void {
  ctx.state.redemptions = ctx.state.redemptions.map((redemption) =>
    redemption.status === 'active' && new Date(redemption.expiresAt) <= ctx.now
      ? { ...redemption, status: 'expired' }
      : redemption,
  )
}

function expireCards(ctx: MockContext): void {
  ctx.state.cards = ctx.state.cards.map((card) => {
    const program = findProgram(ctx, card.shopId)
    if (program !== undefined && isExpiredByInactivity(card, program.expirationPolicy, ctx.now)) {
      return { ...card, balance: 0, stamps: [], rewardExpiresAt: null }
    }
    if (card.rewardExpiresAt !== null && new Date(card.rewardExpiresAt) <= ctx.now) {
      return consumeReward(card)
    }
    return card
  })
}
