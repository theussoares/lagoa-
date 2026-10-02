import { CHECK_IN_LINK_PARAM } from '../constants/domain'
import { CheckInCodeSchema } from '../schemas/shop'
import type { CheckInCode } from '../schemas/shop'
import type { ErrorOf } from '../types/errors'
import { err, ok } from '../types/result'
import { normalizeReadableCode } from './readableCode'
import type { Result } from '../types/result'

type InvalidShopQr = ErrorOf<'invalidShopQr'>

/** Aceita o que a pessoa digitar ("nav 4k7") e normaliza para o formato do código. */
export function parseCheckInCode(input: string): Result<CheckInCode, InvalidShopQr> {
  const parsed = CheckInCodeSchema.safeParse(normalizeReadableCode(input))
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidShopQr' })
}

/**
 * Lê o conteúdo de um QR. O da loja é um link com `?loja=<código>`; o domínio
 * não importa (o mesmo cartaz vale em qualquer ambiente) e quem decide se o
 * código existe é o servidor. Um código puro também é aceito.
 */
export function readCheckInQr(content: string): Result<CheckInCode, InvalidShopQr> {
  const trimmed = content.trim()
  if (!URL.canParse(trimmed)) return parseCheckInCode(trimmed)
  const code = new URL(trimmed).searchParams.get(CHECK_IN_LINK_PARAM)
  return code === null ? err({ code: 'invalidShopQr' }) : parseCheckInCode(code)
}

export const CHECK_IN_PATH = '/check-in'

/** Conteúdo do QR do cartaz: a câmera do celular abre o check-in da loja direto. */
export function checkInLink(origin: string, code: CheckInCode): string {
  const url = new URL(CHECK_IN_PATH, origin)
  url.searchParams.set(CHECK_IN_LINK_PARAM, code)
  return url.toString()
}
