import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { loginAttemptCheck, loginAttemptOutcome, reserveLoginAttempt } from '../utils/loginAttempts'

const PHONE = PhoneNumberSchema.parse('67991230374')
const TARGET = { apiBaseUrl: 'https://api.test/v1', bffSharedSecret: 's3cret', production: true, clientIp: '203.0.113.9' }

afterEach(() => vi.unstubAllGlobals())

describe('loginAttemptCheck', () => {
  it('reserves whenever the BFF secret is set', () => {
    expect(loginAttemptCheck('s3cret', true)).toBe('reserve')
    expect(loginAttemptCheck('s3cret', false)).toBe('reserve')
  })

  it('refuses in production without the secret and skips only in development', () => {
    expect(loginAttemptCheck('', true)).toBe('refuse')
    expect(loginAttemptCheck('', false)).toBe('skip')
  })
})

describe('loginAttemptOutcome', () => {
  it.each([
    [204, { ok: true, value: true }],
    [429, { ok: false, code: 'rateLimited' }],
    [401, { ok: false, code: 'internal' }],
    [500, { ok: false, code: 'internal' }],
    [null, { ok: false, code: 'network' }],
  ])('maps %s', (status, outcome) => {
    expect(loginAttemptOutcome(status)).toEqual(outcome)
  })
})

describe('reserveLoginAttempt', () => {
  it('asks the API with the BFF secret, the client IP and the phone', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await reserveLoginAttempt(TARGET, PHONE)).toEqual({ ok: true, value: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.test/v1/auth/login-attempts')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-bff-secret': 's3cret', 'x-client-ip': '203.0.113.9' })
    expect(JSON.parse(String(init.body))).toEqual({ phone: PHONE })
  })

  it('refuses the attempt when the API is unreachable (fail-closed)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))))
    expect(await reserveLoginAttempt(TARGET, PHONE)).toEqual({ ok: false, code: 'network' })
  })

  it('refuses in production without a secret, without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await reserveLoginAttempt({ ...TARGET, bffSharedSecret: '' }, PHONE)).toEqual({ ok: false, code: 'internal' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
