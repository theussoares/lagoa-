import type { CookieSettings, TokenPair } from '../types/auth'

export const ACCESS_COOKIE = 'lagoa_at'
export const REFRESH_COOKIE = 'lagoa_rt'

/** Raiz, não `/api`: o SSR da página (`/carteira`, `/painel`) precisa receber o cookie para restaurar a sessão ao recarregar. */
const COOKIE_PATH = '/'
/** Caminho antigo: cookies emitidos antes da mudança ainda existem lá e precisam ser limpos no logout. */
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
  return [COOKIE_PATH, LEGACY_COOKIE_PATH].flatMap((path) =>
    [ACCESS_COOKIE, REFRESH_COOKIE].map((name) => ({ name, value: '', options: options(settings, 0, path) })),
  )
}
