import { READABLE_CODE_ALPHABET } from '#shared/constants/domain'
import type { MockContext } from './context'

/** Código para ler em voz alta ou digitar: só caracteres sem sósia (`READABLE_CODE_ALPHABET`). */
export function randomReadableCode(ctx: MockContext, length: number): string {
  return Array.from(
    { length },
    () => READABLE_CODE_ALPHABET[ctx.random.int(READABLE_CODE_ALPHABET.length)] ?? 'A',
  ).join('')
}
