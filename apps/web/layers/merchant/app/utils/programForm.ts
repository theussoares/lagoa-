import { PROGRAM_TARGET_MAX, PROGRAM_TARGET_MIN, REFERENCE_TICKET_REAIS, STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { visitWorthOf } from '#shared/domain/programStrategies'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { Program, ProgramDraft, ProgramMode, ProgramRules } from '#shared/schemas/program'
import type { ProgramField, ProgramFieldErrors } from '../types/program'

const fieldByPath: Readonly<Record<string, ProgramField>> = {
  'reward.title': 'rewardTitle',
  'rules.target': 'target',
  'rules.pointsPerReal': 'pointsPerReal',
  'rules.pointsPerVisit': 'pointsPerVisit',
  'bonusRules.welcomeBonus.units': 'welcomeUnits',
  'bonusRules.referralBonus.units': 'referralUnits',
  'bonusRules.surpriseDay.date': 'surpriseDate',
  'checkIn.cooldownHours': 'cooldownHours',
  'expirationPolicy.months': 'expirationMonths',
}

const DEFAULT_POINTS_PER_REAL = 1
const DEFAULT_POINTS_PER_VISIT = 10

/** Opções do seletor de janela do antifraude, em horas. */
export const COOLDOWN_HOUR_OPTIONS: readonly number[] = [4, 12, 24, 48, 168]
/** Opções de validade dos carimbos, em meses sem visita. */
export const EXPIRATION_MONTH_OPTIONS: readonly number[] = [3, 6, 12, 24]

export function toProgramDraft(program: Program): ProgramDraft {
  return ProgramDraftSchema.parse(program)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max)
}

/**
 * Troca o modo mantendo o mesmo número de visitas até o prêmio:
 * 10 carimbos viram 100 pontos a 10 por visita, não 10 pontos.
 */
export function switchMode(rules: ProgramRules, mode: ProgramMode): ProgramRules {
  if (rules.mode === mode) return rules
  const visits = rules.target / visitWorthOf(rules)
  switch (mode) {
    case 'stamps':
      return { mode, target: clamp(visits, PROGRAM_TARGET_MIN, STAMPS_TARGET_MAX) }
    case 'pointsPerCurrency':
      return { mode, pointsPerReal: DEFAULT_POINTS_PER_REAL, target: clamp(visits * DEFAULT_POINTS_PER_REAL * REFERENCE_TICKET_REAIS, PROGRAM_TARGET_MIN, PROGRAM_TARGET_MAX) }
    case 'pointsPerVisit':
      return { mode, pointsPerVisit: DEFAULT_POINTS_PER_VISIT, target: clamp(visits * DEFAULT_POINTS_PER_VISIT, PROGRAM_TARGET_MIN, PROGRAM_TARGET_MAX) }
  }
}

export function programFieldErrors(draft: ProgramDraft): ProgramFieldErrors {
  const errors: ProgramFieldErrors = {}
  const parsed = ProgramDraftSchema.safeParse(draft)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = fieldByPath[issue.path.join('.')]
      if (field !== undefined) errors[field] = true
    }
  }
  return errors
}

function sortedKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
}

/** Compara pelo conteúdo, não pela ordem das chaves (trocar de modo recria `rules`). */
export function isSameDraft(a: ProgramDraft, b: ProgramDraft): boolean {
  return JSON.stringify(a, sortedKeys) === JSON.stringify(b, sortedKeys)
}
