import { unitOf } from '#shared/domain/programStrategies'
import type { ProgramDraft } from '#shared/schemas/program'
import type { Translate } from '#layers/core/app/utils/translate'
import type { ProgramField, ProgramFieldErrors } from './programForm'

const HOURS_PER_DAY = 24
const SUMMARY_SEPARATOR = ' · '

/** Seções do Programa que ficam fechadas até o lojista abrir. */
export type ProgramFoldSection = 'bonus' | 'visitRules'

export interface ProgramSectionSummaries {
  readonly bonus: string
  readonly visitRules: string
}

const FIELDS_BY_SECTION: Readonly<Record<ProgramFoldSection, readonly ProgramField[]>> = {
  bonus: ['welcomeUnits', 'referralUnits', 'surpriseDate'],
  visitRules: ['cooldownHours', 'expirationMonths'],
}

/** "4 horas", "1 dia", "7 dias". */
export function cooldownLabel(hours: number, t: Translate): string {
  return hours % HOURS_PER_DAY === 0
    ? t('program.visitRules.cooldownDays', { count: hours / HOURS_PER_DAY }, hours / HOURS_PER_DAY)
    : t('program.visitRules.cooldownHours', { count: hours }, hours)
}

/** O que está ligado em cada seção fechada, numa linha: o lojista lê sem precisar abrir. */
export function toProgramSummaries(draft: ProgramDraft, t: Translate): ProgramSectionSummaries {
  const { bonusRules, checkIn, expirationPolicy } = draft
  const unit = unitOf(draft.rules)
  const units = (count: number): string => t(`units.${unit}`, { count }, count)

  const bonus = [
    bonusRules.welcomeBonus.enabled ? t('program.summary.welcome', { units: units(bonusRules.welcomeBonus.units) }) : null,
    bonusRules.birthdayMultiplier.enabled ? t('program.bonus.birthday.label') : null,
    bonusRules.referralBonus.enabled ? t('program.bonus.referral.label') : null,
    bonusRules.surpriseDay.enabled ? t('program.bonus.surprise.label') : null,
  ].filter((part) => part !== null)

  const visitRules = [
    checkIn.enabled ? t('program.summary.checkInOn') : t('program.summary.checkInOff'),
    t('program.summary.cooldown', { interval: cooldownLabel(checkIn.cooldownHours, t) }),
    expirationPolicy.kind === 'never'
      ? t('program.summary.neverExpires')
      : t('program.summary.expiresAfter', { count: expirationPolicy.months }, expirationPolicy.months),
  ]

  return {
    bonus: bonus.length === 0 ? t('program.summary.noBonus') : bonus.join(SUMMARY_SEPARATOR),
    visitRules: visitRules.join(SUMMARY_SEPARATOR),
  }
}

/** Seção fechada com campo errado precisa abrir, senão o erro fica escondido. */
export function sectionHasError(section: ProgramFoldSection, errors: ProgramFieldErrors): boolean {
  return FIELDS_BY_SECTION[section].some((field) => errors[field] === true)
}
