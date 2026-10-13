import type { CookieSettings, TokenPair } from '../types/auth'

export const ACCESS_COOKIE = 'lagoa_at'
export const REFRESH_COOKIE = 'lagoa_rt'

/** Raiz, não `/api`: o SSR só enxerga o cookie se o navegador o mandar junto do pedido da página (ex.: `/carteira` no reload). */
const COOKIE_PATH = '/'
/** Caminho antigo: um cookie velho em `/api` chega antes do novo e sobrepõe a sessão, então é apagado. */
const LEGACY_COOKIE_PATH = '/api'
const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30
/** O cookie some um pouco antes do token vencer, para a API nunca receber um token no limite. */
const EXPIRY_MARGIN_SECONDS = 30

export interface CookieOptions {
  readonly httpOnly: true
  readonly secure: boolean
  readonly sameSite: 'lax'
  readonly path: string
  readonly maxAge: number
}

export interface CookieWrite {
  readonly name: string
  readonly value: string
  readonly options: CookieOptions
}

function options(settings: CookieSettings, maxAge: number, path: string = COOKIE_PATH): CookieOptions {
  return { httpOnly: true, secure: settings.secure, sameSite: 'lax', path, maxAge }
}

export function sessionCookiesFor(tokens: TokenPair, settings: CookieSettings): CookieWrite[] {
  const accessMaxAge = Math.max(tokens.expiresIn - EXPIRY_MARGIN_SECONDS, 0)
  return [
    { name: ACCESS_COOKIE, value: tokens.accessToken, options: options(settings, accessMaxAge) },
    { name: REFRESH_COOKIE, value: tokens.refreshToken, options: options(settings, REFRESH_MAX_AGE_SECONDS) },
  ]
}

export function expiredCookiesFor(settings: CookieSettings): CookieWrite[] {
  return [ACCESS_COOKIE, REFRESH_COOKIE].map((name) => ({ name, value: '', options: options(settings, 0) }))
}

export function legacyExpiredCookiesFor(settings: CookieSettings): CookieWrite[] {
  return [ACCESS_COOKIE, REFRESH_COOKIE].map((name) => ({ name, value: '', options: options(settings, 0, LEGACY_COOKIE_PATH) }))
}
