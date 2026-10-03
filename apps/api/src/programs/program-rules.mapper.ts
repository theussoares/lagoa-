import { ProgramRulesSchema, type ProgramMode, type ProgramRules } from '#shared/schemas/program'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

interface ProgramColumns {
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
