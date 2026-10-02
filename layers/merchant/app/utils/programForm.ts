import { PROGRAM_TARGET_MIN, STAMPS_TARGET_MAX } from '#shared/constants/domain'
import { ProgramDraftSchema } from '#shared/schemas/program'
import type { Program, ProgramDraft, ProgramMode, ProgramRules } from '#shared/schemas/program'

export type ProgramField =
  | 'rewardTitle'
  | 'target'
  | 'pointsPerReal'
  | 'pointsPerVisit'
  | 'welcomeUnits'
  | 'referralUnits'
  | 'surpriseDate'
  | 'cooldownHours'
  | 'expirationMonths'

export type ProgramFieldErrors = Partial<Record<ProgramField, true>>

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

/** Troca o modo mantendo a meta quando ela cabe no modo novo. */
export function switchMode(rules: ProgramRules, mode: ProgramMode): ProgramRules {
  if (rules.mode === mode) return rules
  switch (mode) {
    case 'stamps':
      return { mode, target: Math.min(Math.max(rules.target, PROGRAM_TARGET_MIN), STAMPS_TARGET_MAX) }
    case 'pointsPerCurrency':
      return { mode, pointsPerReal: DEFAULT_POINTS_PER_REAL, target: rules.target }
    case 'pointsPerVisit':
      return { mode, pointsPerVisit: DEFAULT_POINTS_PER_VISIT, target: rules.target }
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
  // O dia surpresa ligado sem data não dobra nada: o lojista precisa escolher o dia.
  if (draft.bonusRules.surpriseDay.enabled && draft.bonusRules.surpriseDay.date === null) errors.surpriseDate = true
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
