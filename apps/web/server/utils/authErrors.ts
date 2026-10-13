import type { AuthErrorCode, ProviderError } from '../types/auth'

const RATE_LIMIT_STATUS = 429

const STATUS_BY_CODE: Readonly<Record<AuthErrorCode, number>> = {
  rateLimited: 429,
  network: 502,
  internal: 500,
  invalidLoginCode: 400,
  loginCodeExpired: 400,
  invalidPhone: 400,
  unauthorized: 401,
}

const isRateLimited = (error: ProviderError): boolean => error.status === RATE_LIMIT_STATUS || (error.code ?? '').includes('rate_limit')

/** Sem `status` HTTP = o pedido nem chegou ao provedor. */
const isOffline = (error: ProviderError): boolean => error.status === undefined || error.status === 0

/** Falha de transporte ou limite: vale para qualquer passo do login. */
export function transportCodeOf(error: ProviderError): AuthErrorCode {
  if (isRateLimited(error)) return 'rateLimited'
  return isOffline(error) ? 'network' : 'internal'
}

const REFUSED_STATUSES: readonly number[] = [400, 401, 403]

/** Só a recusa explícita do refresh token derruba a sessão; 5xx, limite ou rede do provedor não. */
export function refreshErrorCodeOf(error: ProviderError): AuthErrorCode {
  if (isRateLimited(error)) return 'rateLimited'
  if (error.status !== undefined && REFUSED_STATUSES.includes(error.status)) return 'unauthorized'
  return transportCodeOf(error)
}

export function verifyErrorCodeOf(error: ProviderError): AuthErrorCode {
  if (isRateLimited(error) || isOffline(error)) return transportCodeOf(error)
  return error.code === 'otp_expired' ? 'loginCodeExpired' : 'invalidLoginCode'
}

export const authErrorStatus = (code: AuthErrorCode): number => STATUS_BY_CODE[code]
