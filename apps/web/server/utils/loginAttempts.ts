import type { PhoneNumber } from '#shared/schemas/phone'
import type { AuthOutcome } from '../types/auth'
import { buildUpstreamUrl } from './upstream'

const LOGIN_ATTEMPTS_PATH = '/auth/login-attempts'
/** Contador lento não pode segurar o login para sempre: vira `network` e o código não é tentado. */
const LOGIN_ATTEMPTS_TIMEOUT_MS = 5000

export type LoginAttemptCheck = 'reserve' | 'skip' | 'refuse'

/**
 * Sem o segredo do BFF a API não aceita a reserva. Em produção isso é configuração quebrada: recusa (fail-closed). Em
 * desenvolvimento deixa passar, para quem roda o app sem a API local não ficar sem login.
 */
export function loginAttemptCheck(bffSharedSecret: string, production: boolean): LoginAttemptCheck {
  if (bffSharedSecret !== '') return 'reserve'
  return production ? 'refuse' : 'skip'
}

/** 204 = pode tentar; 429 = celular passou do teto (ou o contador caiu); sem resposta = API fora do ar. */
export function loginAttemptOutcome(status: number | null): AuthOutcome<true> {
  if (status === 204) return { ok: true, value: true }
  if (status === 429) return { ok: false, code: 'rateLimited' }
  return { ok: false, code: status === null ? 'network' : 'internal' }
}

export interface LoginAttemptTarget {
  readonly apiBaseUrl: string
  readonly bffSharedSecret: string
  readonly production: boolean
  readonly clientIp: string | undefined
}

/**
 * Reserva uma tentativa de código para este celular na API, antes de falar com o Supabase: lá o limite é por IP e o IP
 * que chega é o do BFF (P-3 da verificação de 2026-10-10). Qualquer falha recusa a tentativa.
 */
export async function reserveLoginAttempt(target: LoginAttemptTarget, phone: PhoneNumber): Promise<AuthOutcome<true>> {
  const check = loginAttemptCheck(target.bffSharedSecret, target.production)
  if (check === 'skip') return { ok: true, value: true }
  if (check === 'refuse') return { ok: false, code: 'internal' }
  const response = await fetch(buildUpstreamUrl({ baseUrl: target.apiBaseUrl, path: LOGIN_ATTEMPTS_PATH, search: '' }), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bff-secret': target.bffSharedSecret,
      ...(target.clientIp === undefined ? {} : { 'x-client-ip': target.clientIp }),
    },
    body: JSON.stringify({ phone }),
    signal: AbortSignal.timeout(LOGIN_ATTEMPTS_TIMEOUT_MS),
  }).catch(() => null)
  return loginAttemptOutcome(response?.status ?? null)
}
