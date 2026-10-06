import { READABLE_CODE_ALPHABET, VISIT_TOKEN_BYTES } from '#shared/constants/domain'
import { VisitTokenSchema } from '#shared/schemas/visitQr'
import type { VisitToken } from '#shared/schemas/visitQr'
import type { MockContext } from './context'

/** Código para ler em voz alta ou digitar: só caracteres sem sósia (`READABLE_CODE_ALPHABET`). */
export function randomReadableCode(ctx: MockContext, length: number): string {
  return Array.from(
    { length },
    () => READABLE_CODE_ALPHABET[ctx.random.int(READABLE_CODE_ALPHABET.length)] ?? 'A',
  ).join('')
}

/** 32 bytes em base64url sem padding (43 caracteres), como o token do servidor; a fonte é a do contexto, para teste. */
export function randomVisitToken(ctx: MockContext): VisitToken {
  const bytes = Array.from({ length: VISIT_TOKEN_BYTES }, () => ctx.random.int(256))
  const base64 = btoa(String.fromCharCode(...bytes))
  return VisitTokenSchema.parse(base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''))
}
