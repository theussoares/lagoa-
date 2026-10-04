import { REWARD_HOLD_DAYS } from '../constants/domain'
import type { ExpirationPolicy } from '../schemas/program'
import { addDays, addMonths } from '../utils/time'

export interface ExpirableCard {
  readonly balance: number
  readonly lastVisitAt: Date | null
  readonly rewardExpiresAt: Date | null
}

export interface ExpirationPlan {
  /** `inactivity`: ficou parado além do prazo e perdeu tudo. `rewardHold`: o prêmio liberado não foi resgatado a tempo. */
  readonly kind: 'inactivity' | 'rewardHold'
  /** Quando o vencimento aconteceu (não quando foi percebido); identifica o evento. */
  readonly dueAt: Date
  readonly unitsLost: number
  readonly balanceAfter: number
  readonly rewardExpiresAt: Date | null
}

/** Quando o cartão vence por falta de visita; `null` se a regra é "nunca" ou se nunca houve visita. */
export function inactivityDueAt(lastVisitAt: Date | null, policy: ExpirationPolicy): Date | null {
  if (policy.kind === 'never' || lastVisitAt === null) return null
  return addMonths(lastVisitAt, policy.months)
}

/**
 * O que venceu num cartão até `now`, ou `null` se nada. Inatividade vence primeiro e leva o saldo todo;
 * senão, o prêmio liberado e não resgatado em `REWARD_HOLD_DAYS` perde uma meta (e, se ainda sobrar uma
 * meta inteira, a guarda recomeça agora). Mesma conta na leitura (saldo efetivo) e na escrita (linha
 * `expiration` no ledger), então as duas nunca discordam.
 */
export function planExpiration(
  card: ExpirableCard,
  policy: ExpirationPolicy,
  target: number,
  now: Date,
): ExpirationPlan | null {
  if (card.balance <= 0) return null

  const inactivityDue = inactivityDueAt(card.lastVisitAt, policy)
  if (inactivityDue !== null && inactivityDue <= now) {
    return { kind: 'inactivity', dueAt: inactivityDue, unitsLost: card.balance, balanceAfter: 0, rewardExpiresAt: null }
  }

  const holdDue = card.rewardExpiresAt
  if (holdDue !== null && holdDue <= now) {
    const unitsLost = Math.min(card.balance, target)
    const balanceAfter = card.balance - unitsLost
    return {
      kind: 'rewardHold',
      dueAt: holdDue,
      unitsLost,
      balanceAfter,
      rewardExpiresAt: balanceAfter >= target ? addDays(now, REWARD_HOLD_DAYS) : null,
    }
  }
  return null
}

/** O cartão como está de verdade agora, sem gravar nada. */
export function applyExpiration<C extends ExpirableCard>(card: C, plan: ExpirationPlan | null): C {
  return plan === null ? card : { ...card, balance: plan.balanceAfter, rewardExpiresAt: plan.rewardExpiresAt }
}
