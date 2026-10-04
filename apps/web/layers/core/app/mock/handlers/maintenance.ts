import { planExpiration } from '#shared/domain/expiration'
import { consumeReward } from '#shared/domain/loyaltyCard'
import { toIso } from '#shared/utils/time'
import type { MockContext } from './context'
import { findProgram } from './queries'

/**
 * O que no backend real é aplicado na leitura e em cada lançamento: códigos vencem, prêmio
 * guardado expira, carimbos vencem por inatividade, ticket de cadastro some. No mock roda antes de cada chamada.
 */
export function runMaintenance(ctx: MockContext): void {
  expireRedemptions(ctx)
  expireCards(ctx)
  expireSignUpTickets(ctx)
}

/** Ticket vencido guarda um celular que não serve mais para nada (LGPD: só o mínimo). */
function expireSignUpTickets(ctx: MockContext): void {
  ctx.state.signUpTickets = ctx.state.signUpTickets.filter((ticket) => new Date(ticket.expiresAt) > ctx.now)
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
    if (program === undefined) return card
    // Mesma regra do servidor (`planExpiration`); o mock só acrescenta as casas do cartão de carimbos.
    const plan = planExpiration(
      {
        balance: card.balance,
        // No mock não há bônus fora da visita: atividade = visita.
        lastActivityAt: card.lastVisitAt === null ? null : new Date(card.lastVisitAt),
        rewardExpiresAt: card.rewardExpiresAt === null ? null : new Date(card.rewardExpiresAt),
      },
      program.expirationPolicy,
      card.target,
      ctx.now,
    )
    if (plan === null) return card
    if (plan.kind === 'inactivity') return { ...card, balance: 0, stamps: [], rewardExpiresAt: null }
    return { ...consumeReward(card), rewardExpiresAt: plan.rewardExpiresAt === null ? null : toIso(plan.rewardExpiresAt) }
  })
}
