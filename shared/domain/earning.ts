import { REWARD_HOLD_DAYS } from '../constants/domain'
import type { Birthday } from '../schemas/common'
import type { BonusRules, ProgramRules } from '../schemas/program'
import { err, ok } from '../types/result'
import type { Result } from '../types/result'
import { addDays, localDateParts } from '../utils/time'
import { applyVisitBonuses, welcomeUnits } from './bonusRules'
import type { AppliedBonus } from './bonusRules'
import { baseUnitsFor } from './programStrategies'
import type { EarnError, EarnInput } from './programStrategies'

export interface EarningCard {
  readonly balance: number
  readonly rewardExpiresAt: Date | null
  /** `null` = a pessoa nunca fez uma visita aqui (o cartão pode existir só com bônus de indicação). */
  readonly lastVisitAt: Date | null
}

export interface EarningRequest {
  readonly rules: ProgramRules
  readonly bonusRules: BonusRules
  readonly customerBirthday: Birthday | null
  /** `null` = ainda não tem cartão nesta loja. */
  readonly card: EarningCard | null
  readonly input: EarnInput
  readonly now: Date
}

export interface EarningPlan {
  readonly welcomeUnits: number
  /** Unidades da visita, já com o bônus do dia (aniversário ou dia surpresa). */
  readonly units: number
  readonly appliedBonuses: readonly AppliedBonus[]
  readonly balanceAfter: number
  /** Prêmio que acabou de liberar fica guardado `REWARD_HOLD_DAYS`; o que já estava guardado não muda. */
  readonly rewardExpiresAt: Date | null
}

/**
 * Tudo que uma visita rende, decidido sem I/O: boas-vindas só na primeira visita, unidades do modo do
 * programa, bônus do dia (vale o maior, não soma) e o prazo do prêmio. Check-in e Balcão usam a mesma.
 */
export function planEarning(request: EarningRequest): Result<EarningPlan, EarnError> {
  const base = baseUnitsFor(request.rules, request.input)
  if (!base.ok) return err(base.error)

  const today = localDateParts(request.now)
  const { units, applied } = applyVisitBonuses(base.value, request.bonusRules, {
    today: { isoDate: today.isoDate, monthDay: today.monthDay },
    customerBirthday: request.customerBirthday,
  })
  // Boas-vindas na primeira visita, não no primeiro cartão: quem ganhou o cartão por indicação ainda não visitou.
  const firstVisit = request.card === null || request.card.lastVisitAt === null
  const welcome = firstVisit ? welcomeUnits(request.bonusRules) : 0
  const balanceAfter = (request.card?.balance ?? 0) + welcome + units
  const alreadyHeld = request.card?.rewardExpiresAt ?? null
  const rewardExpiresAt =
    alreadyHeld ?? (balanceAfter >= request.rules.target ? addDays(request.now, REWARD_HOLD_DAYS) : null)

  return ok({ welcomeUnits: welcome, units, appliedBonuses: applied, balanceAfter, rewardExpiresAt })
}
