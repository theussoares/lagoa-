import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { otpChannelCheck, otpChannelOutcome, recordOtpChannel } from '../utils/otpChannel'

const PHONE = PhoneNumberSchema.parse('67991230374')
const TARGET = { apiBaseUrl: 'https://api.test/v1', bffSharedSecret: 's3cret', production: true, clientIp: '203.0.113.9' }

afterEach(() => vi.unstubAllGlobals())

describe('otpChannelCheck', () => {
  it('records whenever the BFF secret is set', () => {
    expect(otpChannelCheck('s3cret', true)).toBe('record')
    expect(otpChannelCheck('s3cret', false)).toBe('record')
  })

  it('refuses in production without the secret and skips only in development', () => {
    expect(otpChannelCheck('', true)).toBe('refuse')
    expect(otpChannelCheck('', false)).toBe('skip')
  })
})

describe('otpChannelOutcome', () => {
  it.each([
    [204, { ok: true, value: true }],
    [401, { ok: false, code: 'internal' }],
    [500, { ok: false, code: 'internal' }],
    [null, { ok: false, code: 'network' }],
  ])('maps %s', (status, outcome) => {
    expect(otpChannelOutcome(status)).toEqual(outcome)
  })
})

describe('recordOtpChannel', () => {
  it('posts the phone and channel to the API with BFF secret and client IP', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await recordOtpChannel(TARGET, PHONE, 'sms')).toEqual({ ok: true, value: true })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.test/v1/auth/otp-channel')
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'x-bff-secret': 's3cret', 'x-client-ip': '203.0.113.9' })
    expect(JSON.parse(String(init.body))).toEqual({ phone: PHONE, channel: 'sms' })
  })

  it('refuses when the API is unreachable (fail-closed)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))))
    expect(await recordOtpChannel(TARGET, PHONE, 'whatsapp')).toEqual({ ok: false, code: 'network' })
  })

  it('refuses in production without a secret, without calling the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await recordOtpChannel({ ...TARGET, bffSharedSecret: '' }, PHONE, 'sms')).toEqual({ ok: false, code: 'internal' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
