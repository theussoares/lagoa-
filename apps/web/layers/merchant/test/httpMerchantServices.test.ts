import { describe, expect, it, vi } from 'vitest'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import { RedemptionIdSchema } from '#shared/schemas/ids'
import { createHttpMerchantServices } from '../app/services/http/createHttpMerchantServices'

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function servicesWith(fetcher: typeof fetch) {
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized: () => {} })
  return createHttpMerchantServices(api)
}

describe('http merchant services', () => {

  it('visitQr issueVisitQr posts to /merchant/visit-qrs', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      json(201, {
        id: '01925b44-9000-7000-8000-000000000001',
        token: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG',
        visitCode: 'AC3EF',
        status: 'active',
        earn: { kind: 'visit' },
        createdAt: '2026-10-06T12:00:00.000Z',
        expiresAt: '2026-10-06T12:05:00.000Z',
        claim: null,
        refusal: null,
      }),
    )
    const { visitQr } = servicesWith(fetcher)
    const result = await visitQr.issueVisitQr({})
    expect(result.ok).toBe(true)
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/visit-qrs')
  })

  it('visitQr getVisitQr reads GET /merchant/visit-qrs/:id', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'notFound', entity: 'visitQr' }))
    const { visitQr } = servicesWith(fetcher)
    const result = await visitQr.getVisitQr('01925b44-9000-7000-8000-000000000001' as any)
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'visitQr' } })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/visit-qrs/01925b44-9000-7000-8000-000000000001')
  })

  it('counter listTodayEntries reads GET /merchant/counter/entries/today', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, []))
    const { counter } = servicesWith(fetcher)
    const result = await counter.listTodayEntries()
    expect(result).toEqual({ ok: true, value: [] })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/counter/entries/today')
  })

  it('counter validateRedemption posts to /merchant/counter/redemptions/validate', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'redemptionInvalid' }))
    const { counter } = servicesWith(fetcher)
    const code = RedemptionCodeSchema.parse('ACDEFG')
    const result = await counter.validateRedemption(code)
    expect(result).toEqual({ ok: false, error: { code: 'redemptionInvalid' } })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/counter/redemptions/validate')
  })

  it('counter confirmRedemption posts to /merchant/counter/redemptions/:id/confirm', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'redemptionAlreadyUsed' }))
    const { counter } = servicesWith(fetcher)
    const id = RedemptionIdSchema.parse('01925b44-9000-7000-8000-000000000001')
    const result = await counter.confirmRedemption(id)
    expect(result).toEqual({ ok: false, error: { code: 'redemptionAlreadyUsed' } })
    expect(fetcher.mock.calls[0]?.[0]).toBe(`https://api.test/v1/merchant/counter/redemptions/${id}/confirm`)
  })

  it('clubSetup getPoster reads GET /merchant/poster', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(404, { code: 'notFound', entity: 'shop' }))
    const { poster } = servicesWith(fetcher)
    const result = await poster.getPoster()
    expect(result).toEqual({ ok: false, error: { code: 'notFound', entity: 'shop' } })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/poster')
  })

  it('shopStatus reads GET /merchant/shop/status', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { status: 'approved' }))
    const { shopStatus } = servicesWith(fetcher)
    const result = await shopStatus.getStatus()
    expect(result).toEqual({ ok: true, value: 'approved' })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/shop/status')
  })

  it('shopApprovalTesting posts to /merchant/shop/test-approve', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { status: 'approved' }))
    const { shopApprovalTesting } = servicesWith(fetcher)
    expect(shopApprovalTesting).not.toBeNull()
    const result = await shopApprovalTesting!.approveCurrentShop()
    expect(result).toEqual({ ok: true, value: 'approved' })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/merchant/shop/test-approve')
  })
})
