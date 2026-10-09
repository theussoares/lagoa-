import {
  type BonusRules,
  type ExpirationPolicy,
  ExpirationPolicySchema,
  type Program,
  ProgramRulesSchema,
  ProgramSchema,
  type ProgramMode,
  type ProgramRules,
} from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

export interface ProgramColumns {
  readonly mode: ProgramMode
  readonly earnUnits: number
  readonly target: number
}

const rulesInput: { readonly [M in ProgramMode]: (columns: ProgramColumns) => unknown } = {
  stamps: ({ mode, target }) => ({ mode, target }),
  pointsPerVisit: ({ mode, earnUnits, target }) => ({ mode, pointsPerVisit: earnUnits, target }),
  pointsPerCurrency: ({ mode, earnUnits, target }) => ({ mode, pointsPerReal: earnUnits, target }),
}

/**
 * O banco guarda a regra "achatada" (`mode` + `earnUnits` + `target`); o domínio (`shared/`) a
 * enxerga como união por modo. `mode` é a verdade: `unit` e `earn_per` do banco são só derivados.
 * Linha que quebra os limites do domínio vira `invalidProgram`, nunca passa adiante.
 */
export function toProgramRules(columns: ProgramColumns): Result<ProgramRules, ErrorOf<'invalidProgram'>> {
  const parsed = ProgramRulesSchema.safeParse(rulesInput[columns.mode](columns))
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}

export interface ExpirationColumns {
  readonly expirationKind: 'never' | 'afterInactivity'
  readonly expirationMonths: number | null
}

/** `expiration_kind` + `expiration_months` do banco como a política do domínio; combinação inválida não passa. */
export function toExpirationPolicy({ expirationKind, expirationMonths }: ExpirationColumns): Result<ExpirationPolicy, ErrorOf<'invalidProgram'>> {
  const parsed = ExpirationPolicySchema.safeParse(
    expirationKind === 'never' ? { kind: 'never' } : { kind: 'afterInactivity', months: expirationMonths },
  )
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}

export interface ProgramDatabaseColumns extends ProgramColumns, ExpirationColumns {
  readonly id: string
  readonly shopId: string
  readonly rewardTitle: string
  readonly bonusRules: BonusRules
  readonly checkInEnabled: boolean
  readonly checkInCooldownHours: number
}

/** Mapeia colunas do banco diretamente para o schema de domínio `Program`. */
export function toProgram(columns: ProgramDatabaseColumns): Result<Program, ErrorOf<'invalidProgram'>> {
  const rules = toProgramRules(columns)
  if (!rules.ok) return rules

  const expirationPolicy = toExpirationPolicy(columns)
  if (!expirationPolicy.ok) return expirationPolicy

  const parsed = ProgramSchema.safeParse({
    id: columns.id,
    shopId: columns.shopId,
    reward: { title: columns.rewardTitle },
    rules: rules.value,
    bonusRules: columns.bonusRules,
    expirationPolicy: expirationPolicy.value,
    checkIn: {
      enabled: columns.checkInEnabled,
      cooldownHours: columns.checkInCooldownHours,
    },
  })

  return parsed.success ? ok(parsed.data) : err({ code: 'invalidProgram' })
}

