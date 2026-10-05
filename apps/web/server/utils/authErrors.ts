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

export function verifyErrorCodeOf(error: ProviderError): AuthErrorCode {
  if (isRateLimited(error) || isOffline(error)) return transportCodeOf(error)
  return error.code === 'otp_expired' ? 'loginCodeExpired' : 'invalidLoginCode'
}

export const authErrorStatus = (code: AuthErrorCode): number => STATUS_BY_CODE[code]
