import { describe, expect, it, vi } from 'vitest'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import { createHttpCustomerServices } from '#layers/customer/app/services/http/createHttpCustomerServices'
import { CheckInCodeSchema } from '#shared/schemas/shop'

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function servicesWith(fetcher: typeof fetch) {
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, accessToken: async () => 'jwt', onUnauthorized: () => {} })
  let keyCount = 0
  return createHttpCustomerServices(api, () => `key${String(++keyCount).padStart(16, '0')}`)
}

describe('http customer services', () => {
  it('check-in sends the code with a fresh idempotency key per tap', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'invalidShopQr' }))
    const { checkIn } = servicesWith(fetcher)
    const code = CheckInCodeSchema.parse('NAV4K7')
    await checkIn.checkIn(code)
    await checkIn.checkIn(code)
    const keys = fetcher.mock.calls.map((call) => new Headers(call[1]?.headers).get('idempotency-key'))
    expect(keys[0]).not.toBe(keys[1])
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe('{"code":"NAV4K7"}')
  })

  it('check-in keeps the cooldown details and the terms error', async () => {
    const at = '2026-10-01T20:00:00.000Z'
    const { checkIn } = servicesWith(async () => json(429, { code: 'checkInCooldown', availableAt: at }))
    expect(await checkIn.checkIn(CheckInCodeSchema.parse('NAV4K7'))).toEqual({ ok: false, error: { code: 'checkInCooldown', availableAt: at } })
    const terms = servicesWith(async () => json(403, { code: 'termsNotAccepted' }))
    expect(await terms.checkIn.checkIn(CheckInCodeSchema.parse('NAV4K7'))).toEqual({ ok: false, error: { code: 'termsNotAccepted' } })
  })

  it('hides codes a service does not declare', async () => {
    const { wallet } = servicesWith(async () => json(403, { code: 'termsNotAccepted' }))
    expect(await wallet.listCards()).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('wallet reads the limit into the query', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, []))
    const { wallet } = servicesWith(fetcher)
    expect(await wallet.listActivity(5)).toEqual({ ok: true, value: [] })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/wallet/activity?limit=5')
  })

  it('profile consent is a PUT with the flag', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(500, { code: 'internal' }))
    const { profile } = servicesWith(fetcher)
    await profile.setNotificationConsent(true)
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', body: '{"granted":true}' })
  })

  it('referral capture posts the invite and accepts the empty 204', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    const { referral } = servicesWith(fetcher)
    expect(await referral.capture({ referralCode: 'K7M2P9QX', shopCode: 'NAV4K7' })).toEqual({ ok: true, value: undefined })
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', body: '{"referralCode":"K7M2P9QX","shopCode":"NAV4K7"}' })
  })
})
