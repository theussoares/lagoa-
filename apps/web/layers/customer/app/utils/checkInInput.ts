import { CHECK_IN_LINK_PARAM, VISIT_QR_LINK_PARAM } from '#shared/constants/domain'
import { err, ok } from '#shared/types/result'
import { parseCheckInCode, parseVisitCode, parseVisitToken, readScannedQr } from '#shared/utils/checkInCode'
import type { CheckInCodeKind, CheckInInput, CheckInSource } from '../types/checkIn'

const VISIT_FRAGMENT_PREFIX = `${VISIT_QR_LINK_PARAM}=`

/** Fragmento que carrega (ou tenta carregar) um token de visita: não é `id` de elemento, ninguém rola até ele. */
export function hasVisitFragment(hash: string): boolean {
  return hash.replace(/^#/, '').startsWith(VISIT_FRAGMENT_PREFIX)
}

/** Fragmento `#visita=<token>`, o que o QR da visita traz; `null` quando o link não é de uma visita. */
function visitFragmentInput(hash: string): CheckInInput | null {
  if (!hasVisitFragment(hash)) return null
  const token = parseVisitToken(new URLSearchParams(hash.replace(/^#/, '')).get(VISIT_QR_LINK_PARAM) ?? '')
  return token.ok ? ok({ kind: 'claim', credential: { kind: 'token', token: token.value } }) : token
}

/**
 * O que o link do QR abriu: o fragmento da visita (`#visita=`) vale mais que o `?loja=` do cartaz.
 * `null` quando a página foi aberta sem QR.
 */
export function linkIntent(query: unknown, hash: string): CheckInInput | null {
  const visit = visitFragmentInput(hash)
  if (visit !== null) return visit
  const shopCode = typeof query === 'object' && query !== null ? Reflect.get(query, CHECK_IN_LINK_PARAM) : undefined
  if (typeof shopCode !== 'string') return null
  const code = parseCheckInCode(shopCode)
  return code.ok ? ok({ kind: 'join', code: code.value }) : code
}

function typedIntent(raw: string, codeKind: CheckInCodeKind): CheckInInput {
  if (codeKind === 'shop') {
    const code = parseCheckInCode(raw)
    return code.ok ? ok({ kind: 'join', code: code.value }) : code
  }
  const code = parseVisitCode(raw)
  return code.ok ? ok({ kind: 'claim', credential: { kind: 'visitCode', code: code.value } }) : code
}

function scannedIntent(raw: string): CheckInInput {
  const scanned = readScannedQr(raw)
  if (!scanned.ok) return err(scanned.error)
  if (scanned.value.kind === 'shop') return ok({ kind: 'join', code: scanned.value.code })
  return ok({ kind: 'claim', credential: { kind: 'token', token: scanned.value.token } })
}

/**
 * Câmera lê QR (da loja entra, da visita ganha); texto digitado segue o modo escolhido
 * (`codeKind`: código da visita ou do cartaz). Quem decide se o código existe é o servidor.
 */
export function toCheckInIntent(raw: string, source: CheckInSource, codeKind: CheckInCodeKind): CheckInInput {
  return source === 'typed' ? typedIntent(raw, codeKind) : scannedIntent(raw)
}
