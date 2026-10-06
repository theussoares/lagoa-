import { CHECK_IN_LINK_PARAM, VISIT_QR_LINK_PARAM } from '../constants/domain'
import { CheckInCodeSchema } from '../schemas/shop'
import type { CheckInCode } from '../schemas/shop'
import { VisitCodeSchema, VisitTokenSchema } from '../schemas/visitQr'
import type { ScannedQr, VisitCode, VisitToken } from '../schemas/visitQr'
import type { ErrorOf } from '../types/errors'
import { err, ok } from '../types/result'
import { normalizeReadableCode } from './readableCode'
import type { Result } from '../types/result'

type InvalidShopQr = ErrorOf<'invalidShopQr'>
type InvalidVisitQr = ErrorOf<'invalidVisitQr'>

/** Aceita o que a pessoa digitar ("nav 4k7") e normaliza para o formato do código. */
export function parseCheckInCode(input: string): Result<CheckInCode, InvalidShopQr> {
  const parsed = CheckInCodeSchema.safeParse(normalizeReadableCode(input))
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidShopQr' })
}

/** Código curto da visita digitado ("k7 m3p") normalizado; qualquer outro formato é `invalidVisitQr`. */
export function parseVisitCode(input: string): Result<VisitCode, InvalidVisitQr> {
  const parsed = VisitCodeSchema.safeParse(normalizeReadableCode(input))
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidVisitQr' })
}

/** Token do QR da visita: só o formato (43 caracteres base64url); quem decide se existe é o servidor. */
export function parseVisitToken(input: string): Result<VisitToken, InvalidVisitQr> {
  const parsed = VisitTokenSchema.safeParse(input.trim())
  return parsed.success ? ok(parsed.data) : err({ code: 'invalidVisitQr' })
}

/** Fragmento da URL (`#visita=<token>`, com ou sem `#`) → token; qualquer outro fragmento → `null`. */
export function readVisitFragment(hash: string): VisitToken | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const token = new URLSearchParams(raw).get(VISIT_QR_LINK_PARAM)
  if (token === null) return null
  const parsed = parseVisitToken(token)
  return parsed.ok ? parsed.value : null
}

/**
 * Lê o conteúdo de um QR. O da loja é um link com `?loja=<código>` (entrar no clube); o da visita, um link com
 * o fragmento `#visita=<token>` (ganhar). O domínio não importa (o mesmo cartaz vale em qualquer ambiente) e quem
 * decide se o código existe é o servidor. Um código puro de loja também é aceito. `?visita=` não é aceito: o token
 * nunca vai em query (P-19).
 */
export function readScannedQr(content: string): Result<ScannedQr, InvalidShopQr | InvalidVisitQr> {
  const trimmed = content.trim()
  if (!URL.canParse(trimmed)) {
    const code = parseCheckInCode(trimmed)
    return code.ok ? ok({ kind: 'shop', code: code.value }) : code
  }
  const url = new URL(trimmed)
  if (new URLSearchParams(url.hash.slice(1)).has(VISIT_QR_LINK_PARAM)) {
    const token = readVisitFragment(url.hash)
    return token === null ? err({ code: 'invalidVisitQr' }) : ok({ kind: 'visit', token })
  }
  const shopCode = url.searchParams.get(CHECK_IN_LINK_PARAM)
  if (shopCode === null) return err({ code: 'invalidShopQr' })
  const code = parseCheckInCode(shopCode)
  return code.ok ? ok({ kind: 'shop', code: code.value }) : code
}

export const CHECK_IN_PATH = '/check-in'

/** Conteúdo do QR do cartaz: a câmera do celular abre o app para entrar no clube da loja. */
export function checkInLink(origin: string, code: CheckInCode): string {
  const url = new URL(CHECK_IN_PATH, origin)
  url.searchParams.set(CHECK_IN_LINK_PARAM, code)
  return url.toString()
}

/** Conteúdo do QR da visita: `<origin>/check-in#visita=<token>` (CA-25). O fragmento não sai do aparelho. */
export function visitQrLink(origin: string, token: VisitToken): string {
  const url = new URL(CHECK_IN_PATH, origin)
  url.hash = new URLSearchParams({ [VISIT_QR_LINK_PARAM]: token }).toString()
  return url.toString()
}
