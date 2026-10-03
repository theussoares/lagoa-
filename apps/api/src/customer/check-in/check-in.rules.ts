import { checkInAvailableAt } from '#shared/domain/antifraud'
import { type EarningPlan, planEarning } from '#shared/domain/earning'
import type { ErrorOf } from '#shared/types/errors'
import { err, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import type { CheckInShop, CheckInState } from './check-in.repository'

export type CheckInDecisionError = ErrorOf<'checkInCooldown' | 'checkInDisabled'>

/** Antifraude primeiro (janela de qualquer visita), depois o que a visita rende. */
export function decideCheckIn(
  { shop, cooldownHours }: CheckInShop,
  state: CheckInState,
  now: Date,
): Result<EarningPlan, CheckInDecisionError> {
  const availableAt = checkInAvailableAt(state.lastVisitAt, cooldownHours, now)
  if (availableAt !== null) return err({ code: 'checkInCooldown', availableAt: toIso(availableAt) })

  const plan = planEarning({
    rules: shop.program.rules,
    bonusRules: shop.program.bonusRules,
    customerBirthday: state.birthday,
    card: state.card,
    input: { kind: 'visit' },
    now,
  })
  // Clube que só ganha por valor (pontos por real) não aceita check-in: não há valor para ler.
  return plan.ok ? plan : err({ code: 'checkInDisabled' })
}
