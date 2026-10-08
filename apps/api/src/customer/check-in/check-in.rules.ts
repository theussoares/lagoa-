import { type EarningPlan } from '#shared/domain/earning'
import { decideVisitEarning, decideVisitQrUse, type VisitQrUseError } from '#shared/domain/visitQr'
import type { ErrorOf } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { LockedVisitQr, VisitClaimState, VisitQrTarget } from './check-in.repository'

export type EarningDecisionError = ErrorOf<'checkInCooldown' | 'visitQrStale'>

/** RN-11 passos 1–4 sobre o QR travado: quem decide validade e uso único é o domínio compartilhado. */
export function decideQrUse(qr: LockedVisitQr, customerId: string, now: Date): Result<'claim' | 'replay', VisitQrUseError> {
  return decideVisitQrUse(qr, customerId, now)
}

/** RN-11 passos 5–6: janela da versão ativa, depois o que o QR rende nas regras do cartão. */
export function decideEarning(target: VisitQrTarget, state: VisitClaimState, now: Date): Result<EarningPlan, EarningDecisionError> {
  const { rules, bonusRules } = target.shop.program
  return decideVisitEarning({
    rules,
    bonusRules,
    cooldownHours: target.cooldownHours,
    card: state.card,
    birthday: state.birthday,
    earn: target.earn,
    now,
  })
}
