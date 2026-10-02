import type { Birthday, IsoDate } from '../schemas/common'
import type { BonusRules } from '../schemas/program'

export interface EarnContext {
  readonly today: { readonly isoDate: IsoDate; readonly monthDay: string }
  readonly customerBirthday: Birthday | null
}

/** Regra bônus que multiplica as unidades de uma visita. */
interface MultiplierRule {
  applies(rules: BonusRules, context: EarnContext): boolean
  multiplier(rules: BonusRules): number
}

const MULTIPLIER_RULE_NAMES = ['birthdayMultiplier', 'surpriseDay'] as const
export type AppliedBonus = (typeof MULTIPLIER_RULE_NAMES)[number]

const LEAP_DAY = '02-29'
const LEAP_DAY_FALLBACK = '02-28'

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Quem nasceu em 29/02 comemora em 28/02 nos anos sem 29. */
export function isBirthdayToday(birthday: Birthday | null, today: EarnContext['today']): boolean {
  if (birthday === null) return false
  if (birthday === today.monthDay) return true
  return birthday === LEAP_DAY && today.monthDay === LEAP_DAY_FALLBACK && !isLeapYear(Number(today.isoDate.slice(0, 4)))
}

const multiplierRules: Readonly<Record<AppliedBonus, MultiplierRule>> = {
  birthdayMultiplier: {
    applies: (rules, context) =>
      rules.birthdayMultiplier.enabled && isBirthdayToday(context.customerBirthday, context.today),
    multiplier: (rules) => rules.birthdayMultiplier.multiplier,
  },
  surpriseDay: {
    applies: (rules, context) => rules.surpriseDay.enabled && rules.surpriseDay.date === context.today.isoDate,
    multiplier: (rules) => rules.surpriseDay.multiplier,
  },
}

/**
 * Bônus não se acumulam entre si: vale o maior multiplicador do dia
 * (aniversário no dia surpresa continua em dobro, não quádruplo).
 */
export function applyVisitBonuses(
  baseUnits: number,
  rules: BonusRules,
  context: EarnContext,
): { units: number; applied: AppliedBonus[] } {
  const applied = MULTIPLIER_RULE_NAMES.filter((name) =>
    multiplierRules[name].applies(rules, context),
  )
  const multiplier = Math.max(1, ...applied.map((name) => multiplierRules[name].multiplier(rules)))
  return { units: baseUnits * multiplier, applied }
}

export function welcomeUnits(rules: BonusRules): number {
  return rules.welcomeBonus.enabled ? rules.welcomeBonus.units : 0
}
