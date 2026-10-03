import type { RedemptionRequestState, RequestDecision } from './redemption.repository'

/** Prêmio pronto + código ainda válido = o mesmo código; vencido = sai o velho e entra um novo. */
export function decideRedemptionRequest(state: RedemptionRequestState, now: Date): RequestDecision {
  if (state.balance < state.target) return { kind: 'notReady', remaining: state.target - state.balance }
  if (state.active === null) return { kind: 'create', expireStaleId: null }
  if (state.active.expiresAt > now) return { kind: 'reuse' }
  return { kind: 'create', expireStaleId: state.active.id }
}
