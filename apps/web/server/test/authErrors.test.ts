import { describe, expect, it } from 'vitest'
import { authErrorStatus, transportCodeOf, verifyErrorCodeOf } from '../utils/authErrors'

describe('auth errors', () => {
  it('tells rate limit, offline and other failures apart', () => {
    expect(transportCodeOf({ status: 429 })).toBe('rateLimited')
    expect(transportCodeOf({ status: 400, code: 'over_sms_send_rate_limit' })).toBe('rateLimited')
    expect(transportCodeOf({})).toBe('network')
    expect(transportCodeOf({ status: 500 })).toBe('internal')
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
