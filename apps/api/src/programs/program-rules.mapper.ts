import { ProgramRulesSchema, type ProgramMode, type ProgramRules } from '#shared/schemas/program'

interface ProgramColumns {
  readonly mode: ProgramMode
  readonly earnUnits: number
  readonly target: number
}

/**
 * O banco guarda a regra "achatada" (`mode` + `earnUnits` + `target`); o domínio (`shared/`) a
 * enxerga como união por modo. `mode` é a verdade: `unit` e `earn_per` do banco são só derivados.
 */
export function toProgramRules({ mode, earnUnits, target }: ProgramColumns): ProgramRules {
  switch (mode) {
    case 'stamps':
      return ProgramRulesSchema.parse({ mode, target })
    case 'pointsPerVisit':
      return ProgramRulesSchema.parse({ mode, pointsPerVisit: earnUnits, target })
    case 'pointsPerCurrency':
      return ProgramRulesSchema.parse({ mode, pointsPerReal: earnUnits, target })
  }
}
