import { describe, expect, it, vi } from 'vitest'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import { createHttpCustomerServices } from '#layers/customer/app/services/http/createHttpCustomerServices'
import { CheckInCodeSchema } from '#shared/schemas/shop'
import { VisitCodeSchema, VisitTokenSchema } from '#shared/schemas/visitQr'

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function servicesWith(fetcher: typeof fetch) {
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized: () => {} })
  let keyCount = 0
  return createHttpCustomerServices(api, () => `key${String(++keyCount).padStart(16, '0')}`)
}

const TOKEN = VisitTokenSchema.parse('A'.repeat(43))
const CODE = VisitCodeSchema.parse('K7M2P')
const checkInResult = {
  activity: { id: 'visit_1', shopId: 'shop_1', shopName: 'Barbearia', kind: 'visit', unit: 'stamp', units: 1, rewardTitle: null, createdAt: '2026-10-01T16:00:00.000Z' },
  card: { cardId: 'card_1', unit: 'stamp', balance: 4, target: 10, rewardReady: false },
  nextCheckInAt: '2026-10-01T20:00:00.000Z',
}

describe('http customer services', () => {
  it('join shop posts the poster code to /shop-join and validates the answer', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { shopId: 'shop_1', cardId: 'card_1', alreadyMember: false }))
    const { checkIn } = servicesWith(fetcher)
    expect(await checkIn.joinShop(CheckInCodeSchema.parse('NAV4K7'))).toMatchObject({ ok: true, value: { alreadyMember: false } })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/shop-join')
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', body: '{"code":"NAV4K7"}' })
  })

  it('join shop keeps its declared errors and hides the rest', async () => {
    const disabled = servicesWith(async () => json(403, { code: 'checkInDisabled' }))
    expect(await disabled.checkIn.joinShop(CheckInCodeSchema.parse('NAV4K7'))).toEqual({ ok: false, error: { code: 'checkInDisabled' } })
    const stale = servicesWith(async () => json(409, { code: 'visitQrStale' }))
    expect(await stale.checkIn.joinShop(CheckInCodeSchema.parse('NAV4K7'))).toEqual({ ok: false, error: { code: 'internal' } })
    const malformed = servicesWith(async () => json(200, { shopId: 'shop_1' }))
    expect(await malformed.checkIn.joinShop(CheckInCodeSchema.parse('NAV4K7'))).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('claims a scanned token on POST /check-in with the token only in the body and a fresh idempotency key', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, checkInResult))
    const { checkIn } = servicesWith(fetcher)
    expect((await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })).ok).toBe(true)
    await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/v1/check-in')
    expect(String(url)).not.toContain(TOKEN)
    expect(init).toMatchObject({ method: 'POST', body: `{"token":"${TOKEN}"}` })
    const keys = fetcher.mock.calls.map((call) => new Headers(call[1]?.headers).get('idempotency-key'))
    expect(keys[0]).not.toBe(keys[1])
  })

  it('claims a typed short code on POST /check-in/code', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, checkInResult))
    const { checkIn } = servicesWith(fetcher)
    await checkIn.claimVisitQr({ kind: 'visitCode', code: CODE })
    const [url, init] = fetcher.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/v1/check-in/code')
    expect(init).toMatchObject({ method: 'POST', body: '{"visitCode":"K7M2P"}' })
    expect(new Headers(init?.headers).get('idempotency-key')).toMatch(/^key/)
  })

  it('claim keeps the visit QR errors, the cooldown details and the rate limit', async () => {
    for (const code of ['invalidVisitQr', 'visitQrExpired', 'visitQrAlreadyUsed', 'visitQrStale', 'termsNotAccepted'] as const) {
      const { checkIn } = servicesWith(async () => json(409, { code }))
      expect(await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })).toEqual({ ok: false, error: { code } })
    }
    const at = '2026-10-01T20:00:00.000Z'
    const cooldown = servicesWith(async () => json(429, { code: 'checkInCooldown', availableAt: at }))
    expect(await cooldown.checkIn.claimVisitQr({ kind: 'token', token: TOKEN })).toEqual({ ok: false, error: { code: 'checkInCooldown', availableAt: at } })
    const limited = servicesWith(async () => json(429, { code: 'rateLimited' }))
    expect(await limited.checkIn.claimVisitQr({ kind: 'visitCode', code: CODE })).toEqual({ ok: false, error: { code: 'rateLimited' } })
  })

  it('claim hides a code it does not declare', async () => {
    const { checkIn } = servicesWith(async () => json(422, { code: 'shopQrJoinOnly' }))
    expect(await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('claim sends the token in the body with a fresh idempotency key per tap, never in the URL', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'invalidVisitQr' }))
    const { checkIn } = servicesWith(fetcher)
    await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })
    await checkIn.claimVisitQr({ kind: 'token', token: TOKEN })
    const keys = fetcher.mock.calls.map((call) => new Headers(call[1]?.headers).get('idempotency-key'))
    expect(keys[0]).not.toBe(keys[1])
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/check-in')
    expect(fetcher.mock.calls[0]?.[1]?.body).toBe(`{"token":"${TOKEN}"}`)
  })

  it('claim keeps the terms error', async () => {
    const terms = servicesWith(async () => json(403, { code: 'termsNotAccepted' }))
    expect(await terms.checkIn.claimVisitQr({ kind: 'token', token: TOKEN })).toEqual({ ok: false, error: { code: 'termsNotAccepted' } })
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

  it('data export reads GET /customer/data-export and rejects a malformed body', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { nope: true }))
    const { dataExport } = servicesWith(fetcher)
    expect(await dataExport.exportMyData()).toEqual({ ok: false, error: { code: 'internal' } })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/data-export')
  })

  it('ranking sends the nickname to join and nothing but the flag to leave', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(500, { code: 'internal' }))
    const { ranking } = servicesWith(fetcher)
    await ranking.setConsent({ granted: true, name: 'Ana' })
    await ranking.setConsent({ granted: false })
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', body: '{"granted":true,"name":"Ana"}' })
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ body: '{"granted":false}' })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/ranking/consent')
  })

  it('account erasure is a DELETE that accepts the empty 204', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }))
    const { account } = servicesWith(fetcher)
    expect(await account.eraseAccount()).toEqual({ ok: true, value: undefined })
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/account')
  })
})
