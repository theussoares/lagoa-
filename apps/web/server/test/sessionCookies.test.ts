import { describe, expect, it } from 'vitest'
import { ACCESS_COOKIE, REFRESH_COOKIE, expiredCookiesFor, sessionCookiesFor } from '../utils/sessionCookies'

const tokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 }

describe('session cookies', () => {
  it('are httpOnly, SameSite=Lax and scoped to /api', () => {
    for (const cookie of sessionCookiesFor(tokens, { secure: true })) {
      expect(cookie.options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/api' })
    }
  })

  it('make the access cookie expire a little before the token does', () => {
    const access = sessionCookiesFor(tokens, { secure: false }).find((cookie) => cookie.name === ACCESS_COOKIE)
    expect(access?.options.maxAge).toBe(3570)
  })

  it('keep the refresh cookie longer than the access one', () => {
    const [access, refresh] = sessionCookiesFor(tokens, { secure: false })
    expect(refresh?.name).toBe(REFRESH_COOKIE)
    expect(refresh?.options.maxAge).toBeGreaterThan(access?.options.maxAge ?? 0)
  })

  it('expire both on sign out', () => {
    expect(expiredCookiesFor({ secure: false }).map((cookie) => [cookie.name, cookie.value, cookie.options.maxAge])).toEqual([
      [ACCESS_COOKIE, '', 0],
      [REFRESH_COOKIE, '', 0],
    ])
  })
})
