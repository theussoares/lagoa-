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
 * senão, cada prêmio liberado e não resgatado em `REWARD_HOLD_DAYS` perde uma meta, e se ainda sobrar uma
 * meta inteira a guarda dela corre a partir do vencimento da anterior (`+ REWARD_HOLD_DAYS`), nunca de
 * `now`: o resultado só depende de quando o cartão é lido para saber *quantas* guardas já venceram, então
 * leitura e escrita concordam e o prazo mostrado não anda sozinho.
 *
 * A inatividade não vence antes do prêmio que está guardado: o cliente tem os `REWARD_HOLD_DAYS` prometidos
 * mesmo com uma política curta (1 mês).
 */
export function planExpiration(
  card: ExpirableCard,
  policy: ExpirationPolicy,
  target: number,
  now: Date,
): ExpirationPlan | null {
  if (card.balance <= 0) return null

  const idleDue = inactivityDueAt(card.lastVisitAt, policy)
  const inactivityDue = idleDue !== null && card.rewardExpiresAt !== null && card.rewardExpiresAt > idleDue ? card.rewardExpiresAt : idleDue
  if (inactivityDue !== null && inactivityDue <= now) {
    return { kind: 'inactivity', dueAt: inactivityDue, unitsLost: card.balance, balanceAfter: 0, rewardExpiresAt: null }
  }

  const firstHoldDue = card.rewardExpiresAt
  if (firstHoldDue === null || firstHoldDue > now) return null

  let balance = card.balance
  let hold: Date | null = firstHoldDue
  while (hold !== null && hold <= now && balance > 0) {
    balance -= Math.min(balance, target)
    hold = balance >= target ? addDays(hold, REWARD_HOLD_DAYS) : null
  }
  return { kind: 'rewardHold', dueAt: firstHoldDue, unitsLost: card.balance - balance, balanceAfter: balance, rewardExpiresAt: hold }
}

/** O cartão como está de verdade agora, sem gravar nada. */
export function applyExpiration<C extends ExpirableCard>(card: C, plan: ExpirationPlan | null): C {
  return plan === null ? card : { ...card, balance: plan.balanceAfter, rewardExpiresAt: plan.rewardExpiresAt }
}
