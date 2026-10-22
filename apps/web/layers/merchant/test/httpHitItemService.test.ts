import { describe, expect, it, vi } from 'vitest'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { MerchantHitItem } from '#shared/schemas/hitItem'
import { HttpHitItemService } from '../app/services/http/HttpHitItemService'
import { describeHitItemContract, draft, upload } from './hitItemContract'

const ID = '0190b0c0-1111-7000-8000-000000000001'
const stored: MerchantHitItem = {
  ...draft,
  id: ID,
  status: 'pending',
  rejectionReason: null,
  photoUrl: null,
  createdAt: '2026-10-19T12:00:00.000Z',
  updatedAt: '2026-10-19T12:00:00.000Z',
}
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

/** Um servidor de mentira com as regras da API (teto, arquivado, desarquivar), só o necessário para o contrato. */
function fakeServer(cap: number): typeof fetch {
  let items: MerchantHitItem[] = []
  const active = (): number => items.filter((item) => item.status !== 'archived').length
  const find = (id: string): MerchantHitItem | undefined => items.find((item) => item.id === id)
  const put = (item: MerchantHitItem): Response => {
    items = items.map((current) => (current.id === item.id ? item : current))
    return json(200, item)
  }
  const notFound = (): Response => json(404, { code: 'notFound', entity: 'hitItem' })
  return async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    const [, , , id, action] = url.pathname.split('/').slice(1)
    if (id === undefined) {
      if (method === 'GET') return json(200, { items, cap })
      if (active() >= cap) return json(409, { code: 'limitReached' })
      const item = { ...stored, ...(body as object), id: crypto.randomUUID() }
      items = [item, ...items]
      return json(201, item)
    }
    const current = find(id)
    if (current === undefined) return notFound()
    if (action === 'archive') return put({ ...current, status: 'archived' })
    if (action === 'unarchive') {
      if (current.status !== 'archived') return json(409, { code: 'invalidTransition' })
      return active() >= cap ? json(409, { code: 'limitReached' }) : put({ ...current, status: 'pending' })
    }
    if (current.status === 'archived') return json(409, { code: 'invalidTransition' })
    return put(action === 'photo' ? { ...current, photoUrl: 'https://cdn.test/p.webp', status: 'pending' } : { ...current, ...(body as object), status: 'pending' })
  }
}

describe('HttpHitItemService', () => {
  describeHitItemContract((cap) => new HttpHitItemService(new ApiClient({ baseUrl: 'https://bff.test/api', fetcher: fakeServer(cap), onUnauthorized: vi.fn() })))

  it('calls the BFF routes with the right method and path', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, stored))
    const service = new HttpHitItemService(new ApiClient({ baseUrl: 'https://bff.test/api', fetcher, onUnauthorized: vi.fn() }))
    await service.update(ID, draft)
    await service.uploadPhoto(ID, upload)
    await service.archive(ID)
    await service.unarchive(ID)
    expect(fetcher.mock.calls.map(([url, init]) => `${init?.method} ${String(url).replace('https://bff.test/api', '')}`)).toEqual([
      `PATCH /merchant/hits/${ID}`,
      `PUT /merchant/hits/${ID}/photo`,
      `POST /merchant/hits/${ID}/archive`,
      `POST /merchant/hits/${ID}/unarchive`,
    ])
  })
})
