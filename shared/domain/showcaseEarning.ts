import { z } from 'zod'
import type { BonusRules, ProgramRules } from '../schemas/program'
import { ProgramUnitSchema } from '../schemas/program'
import { localDateParts } from '../utils/time'
import { isSurpriseDay } from './bonusRules'
import { planEarning } from './earning'
import { strategyFor } from './programStrategies'
import type { EarnInput } from './programStrategies'

/** "Rende X" da vitrine: igual para todos, sem aniversário nem boas-vindas. `null` = não dá para calcular. */
export const ShowcaseEarningSchema = z
  .object({ unit: ProgramUnitSchema, units: z.number().int().positive(), doubled: z.boolean() })
  .nullable()
export type ShowcaseEarning = z.infer<typeof ShowcaseEarningSchema>

export interface ShowcaseEarningInput {
  readonly rules: ProgramRules
  readonly bonusRules: BonusRules
  readonly priceCents: number | null
  readonly now: Date
}

/** Hoje (data local do piloto) é o dia surpresa da loja? Mesma regra de `applyVisitBonuses`. */
export function isSurpriseDayToday(bonusRules: BonusRules, now: Date): boolean {
  return isSurpriseDay(bonusRules, localDateParts(now).isoDate)
}

function earnInputFor(rules: ProgramRules, priceCents: number | null): EarnInput | null {
  if (!strategyFor(rules).acceptsAmount) return { kind: 'visit' }
  return priceCents === null ? null : { kind: 'amount', amountCents: priceCents }
}

/**
 * Quanto a compra rende pela regra do programa ativo, calculado por `planEarning` (nunca copiado nem guardado).
 * Só o dia surpresa entra: aniversário e boas-vindas dependem da pessoa.
 */
export function showcaseEarning(input: ShowcaseEarningInput): ShowcaseEarning {
  const earnInput = earnInputFor(input.rules, input.priceCents)
  if (earnInput === null) return null
  const plan = planEarning({
    rules: input.rules,
    bonusRules: { ...input.bonusRules, birthdayMultiplier: { ...input.bonusRules.birthdayMultiplier, enabled: false } },
    customerBirthday: null,
    card: null,
    input: earnInput,
    now: input.now,
  })
  if (!plan.ok) return null
  return {
    unit: strategyFor(input.rules).unit,
    units: plan.value.units,
    doubled: plan.value.appliedBonuses.includes('surpriseDay'),
  }
}
