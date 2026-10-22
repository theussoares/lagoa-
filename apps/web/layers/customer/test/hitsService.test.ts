import { describe, expect, it, vi } from 'vitest'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import { createHttpCustomerServices } from '#layers/customer/app/services/http/createHttpCustomerServices'

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })
const CURSOR = '6f1c2a3e-8b0d-4c57-9a1e-3d2f4b5a6c7d'

function servicesWith(fetcher: typeof fetch) {
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized: () => {} })
  return createHttpCustomerServices(api, () => 'key0000000000000000')
}

const item = {
  id: CURSOR,
  title: 'Corte masculino',
  description: null,
  priceCents: 4500,
  photoUrl: 'https://cdn.test/corte.jpg',
  earning: { unit: 'stamp', units: 1, doubled: false },
  contact: null,
  shop: { id: 'shop_1', name: 'Barbearia', category: 'beauty', neighborhood: 'Centro' },
}

describe('http hits and featured services', () => {
  it('lists hits with the group and cursor in the query', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { items: [], nextCursor: null }))
    const { hits } = servicesWith(fetcher)
    expect(await hits.list({ group: 'food', cursor: CURSOR })).toEqual({ ok: true, value: { items: [], nextCursor: null } })
    expect(fetcher.mock.calls[0]?.[0]).toBe(`https://api.test/v1/hits?group=food&cursor=${CURSOR}`)
  })

  it('omits an empty query', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { items: [], nextCursor: null }))
    await servicesWith(fetcher).hits.list({})
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/hits')
  })

  it('turns an out-of-schema page into a transport error', async () => {
    const { hits } = servicesWith(async () => json(200, { items: [{ id: 'x' }], nextCursor: null }))
    expect(await hits.list({})).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('reads banners and rejects a malformed answer', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, [{ item, sponsored: true }]))
    const ok = await servicesWith(fetcher).hits.banners()
    expect(ok.ok).toBe(true)
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/hits/banners')
    expect(await servicesWith(async () => json(200, [{ sponsored: true }])).hits.banners()).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('reads featured shops from /discover/featured and rejects a malformed answer', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, []))
    expect(await servicesWith(fetcher).discover.listFeatured()).toEqual({ ok: true, value: [] })
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/discover/featured')
    expect(await servicesWith(async () => json(200, [{ id: 1 }])).discover.listFeatured()).toEqual({ ok: false, error: { code: 'internal' } })
  })
})
