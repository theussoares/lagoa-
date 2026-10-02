import { BONUS_UNITS_MAX, REMINDER_BONUS_MIN_UNITS, REMINDER_BONUS_SUGGESTED_VISITS } from '../constants/domain'
import type { ReminderBonusLimits, ReminderReach } from '../schemas/campaign'
import type { IsoDateTime } from '../schemas/common'
import type { ProgramRules } from '../schemas/program'
import { isLapsedSince } from './customer'
import { visitWorthOf } from './programStrategies'

export type ReminderEligibility = 'notLapsed' | 'withoutConsent' | 'expired' | 'alreadyReminded' | 'reachable'

export interface ReminderCandidate {
  readonly lastVisitAt: IsoDateTime | null
  readonly acceptsNotifications: boolean
  readonly lastRemindedAt: IsoDateTime | null
  /** Cartão zerado por inatividade: um presente seria zerado de novo, porque o bônus não conta como visita. */
  readonly isExpired: boolean
}

/** Um lembrete por sumiço: só volta a receber depois de visitar a loja e sumir de novo. */
function remindedSinceLastVisit(candidate: ReminderCandidate): boolean {
  const { lastRemindedAt, lastVisitAt } = candidate
  return lastRemindedAt !== null && lastVisitAt !== null && Date.parse(lastRemindedAt) >= Date.parse(lastVisitAt)
}

export function reminderEligibility(candidate: ReminderCandidate, now: Date): ReminderEligibility {
  if (!isLapsedSince(candidate.lastVisitAt, now)) return 'notLapsed'
  if (!candidate.acceptsNotifications) return 'withoutConsent'
  if (candidate.isExpired) return 'expired'
  if (remindedSinceLastVisit(candidate)) return 'alreadyReminded'
  return 'reachable'
}

export function summarizeReach(eligibilities: readonly ReminderEligibility[]): ReminderReach {
  const count = (kind: ReminderEligibility): number => eligibilities.filter((value) => value === kind).length
  const reach = {
    withoutConsent: count('withoutConsent'),
    expired: count('expired'),
    alreadyReminded: count('alreadyReminded'),
    reachable: count('reachable'),
  }
  return { lapsed: reach.withoutConsent + reach.expired + reach.alreadyReminded + reach.reachable, ...reach }
}

/**
 * Presente em unidades do programa, medido em visitas: sugere o que uma visita
 * rende e nunca chega à meta, para o prêmio não sair sem o cliente voltar.
 */
export function reminderBonusLimits(rules: ProgramRules): ReminderBonusLimits {
  const worth = visitWorthOf(rules)
  const max = Math.max(REMINDER_BONUS_MIN_UNITS, Math.min(worth * BONUS_UNITS_MAX, rules.target - 1))
  return { min: REMINDER_BONUS_MIN_UNITS, max, suggested: Math.min(worth * REMINDER_BONUS_SUGGESTED_VISITS, max) }
}

export function isBonusWithinLimits(units: number, limits: ReminderBonusLimits): boolean {
  return Number.isInteger(units) && units >= limits.min && units <= limits.max
}
