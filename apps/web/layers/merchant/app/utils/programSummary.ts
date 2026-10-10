import { unitOf } from '#shared/domain/programStrategies'
import type { CheckInCooldown, ProgramDraft } from '#shared/schemas/program'
import type { Translate } from '#layers/core/app/types/i18n'
import type { ProgramField, ProgramFieldErrors, ProgramFoldSection, ProgramSectionSummaries } from '../types/program'

const HOURS_PER_DAY = 24
const SUMMARY_SEPARATOR = ' · '

const FIELDS_BY_SECTION: Readonly<Record<ProgramFoldSection, readonly ProgramField[]>> = {
  bonus: ['welcomeUnits', 'referralUnits', 'surpriseDate'],
  visitRules: ['cooldownHours', 'expirationMonths'],
}

/** "4 horas", "24 horas", "2 dias", "1 vez por dia". 24 h fica em horas para não confundir com o dia. */
export function cooldownLabel(cooldown: CheckInCooldown, t: Translate): string {
  if (cooldown.cooldownMode === 'calendarDay') return t('program.visitRules.cooldownCalendarDay')
  const hours = cooldown.cooldownHours
  return hours % HOURS_PER_DAY === 0 && hours > HOURS_PER_DAY
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
    checkIn.cooldownMode === 'calendarDay'
      ? t('program.summary.cooldownCalendarDay')
      : t('program.summary.cooldown', { interval: cooldownLabel(checkIn, t) }),
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
