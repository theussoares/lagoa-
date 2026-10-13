import { describe, expect, it } from 'vitest'
import { authErrorStatus, refreshErrorCodeOf, transportCodeOf, verifyErrorCodeOf } from '../utils/authErrors'

describe('auth errors', () => {
  it('tells rate limit, offline and other failures apart', () => {
    expect(transportCodeOf({ status: 429 })).toBe('rateLimited')
    expect(transportCodeOf({ status: 400, code: 'over_sms_send_rate_limit' })).toBe('rateLimited')
    expect(transportCodeOf({})).toBe('network')
    expect(transportCodeOf({ status: 500 })).toBe('internal')
  })

  it('ends the session only when the provider refuses the refresh token', () => {
    expect(refreshErrorCodeOf({ status: 400, code: 'refresh_token_not_found' })).toBe('unauthorized')
    expect(refreshErrorCodeOf({ status: 401 })).toBe('unauthorized')
    expect(refreshErrorCodeOf({ status: 429 })).toBe('rateLimited')
    expect(refreshErrorCodeOf({ status: 503 })).toBe('internal')
    expect(refreshErrorCodeOf({})).toBe('network')
  })

  it('maps a wrong or expired code, and leaves transport failures alone', () => {
    expect(verifyErrorCodeOf({ status: 403, code: 'otp_expired' })).toBe('loginCodeExpired')
    expect(verifyErrorCodeOf({ status: 400, code: 'validation_failed' })).toBe('invalidLoginCode')
    expect(verifyErrorCodeOf({ status: 429 })).toBe('rateLimited')
  })

  it('gives each code its HTTP status', () => {
    expect([authErrorStatus('unauthorized'), authErrorStatus('rateLimited'), authErrorStatus('network')]).toEqual([401, 429, 502])
  })
})
