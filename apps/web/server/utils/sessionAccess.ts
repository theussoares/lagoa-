import { deleteCookie, getCookie, setCookie, type H3Event } from 'h3'
import type { AuthOutcome, CookieSettings, TokenPair } from '../types/auth'
import { ACCESS_COOKIE, REFRESH_COOKIE, expiredCookiesFor, sessionCookiesFor, type CookieWrite } from './sessionCookies'
import { createPhoneLogin } from './serverConfig'

function write(event: H3Event, cookies: readonly CookieWrite[]): void {
  for (const cookie of cookies) setCookie(event, cookie.name, cookie.value, cookie.options)
}

export function startSession(event: H3Event, tokens: TokenPair, settings: CookieSettings): void {
  write(event, sessionCookiesFor(tokens, settings))
}

export function endSession(event: H3Event, settings: CookieSettings): void {
  for (const cookie of expiredCookiesFor(settings)) deleteCookie(event, cookie.name, cookie.options)
}

export function storedTokens(event: H3Event): { accessToken: string | undefined; refreshToken: string | undefined } {
  return { accessToken: getCookie(event, ACCESS_COOKIE), refreshToken: getCookie(event, REFRESH_COOKIE) }
}

/**
 * Token de acesso para chamar a API: o do cookie, ou um novo pelo refresh token quando o cookie venceu.
 * `unauthorized` = sem sessão ou refresh recusado (os cookies são limpos); falha de rede/limite do provedor
 * vem como ela é, para não derrubar a sessão por um soluço.
 */
export async function resolveAccessToken(event: H3Event, settings: CookieSettings): Promise<AuthOutcome<string>> {
  const { accessToken, refreshToken } = storedTokens(event)
  if (accessToken !== undefined) return { ok: true, value: accessToken }
  if (refreshToken === undefined) return { ok: false, code: 'unauthorized' }
  const refreshed = await createPhoneLogin().refresh(refreshToken)
  if (refreshed.ok) {
    startSession(event, refreshed.value, settings)
    return { ok: true, value: refreshed.value.accessToken }
  }
  if (refreshed.code !== 'internal') return refreshed
  endSession(event, settings)
  return { ok: false, code: 'unauthorized' }
}
