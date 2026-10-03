import type { ProgramUnit } from '#shared/schemas/program'
import type { Translate } from '../types/i18n'

/** "1 carimbo", "3 pontos": o plural vem do `pt-BR.json`. */
export function unitsText(t: Translate, unit: ProgramUnit, count: number): string {
  return t(`units.${unit}`, { count }, count)
}
