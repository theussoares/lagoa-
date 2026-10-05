import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiClient, allowing, transportOnly } from '#layers/core/app/services/http/ApiClient'
import { parseDomainError } from '#layers/core/app/utils/domainError'

const json = (status: number, body: unknown): Response => new Response(status === 204 ? null : JSON.stringify(body), { status })

function clientWith(fetcher: typeof fetch) {
  const onUnauthorized = vi.fn()
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized })
  return { api, onUnauthorized }
}

describe('ApiClient', () => {
  it('validates the response with the schema and never sends a token itself (the BFF adds it)', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(200, { n: 1 }))
    const { api } = clientWith(fetcher)
    expect(await api.get('/x', z.object({ n: z.number() }))).toEqual({ ok: true, value: { n: 1 } })
    const init = fetcher.mock.calls[0]?.[1]
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.test/v1/x')
    expect(init?.headers).not.toHaveProperty('authorization')
  })

  it('treats a response outside the contract as internal', async () => {
    const { api } = clientWith(async () => json(200, { n: 'x' }))
    expect(await api.get('/x', z.object({ n: z.number() }))).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('turns an offline fetch into network', async () => {
    const { api } = clientWith(async () => Promise.reject(new TypeError('failed')))
    expect(await api.get('/x', z.unknown())).toEqual({ ok: false, error: { code: 'network' } })
  })

  it('a 401 from the API ends the local session', async () => {
    const { api, onUnauthorized } = clientWith(async () => json(401, { code: 'unauthorized' }))
    expect(await api.get('/x', z.unknown())).toEqual({ ok: false, error: { code: 'unauthorized' } })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('sends the JSON body with the content type, and accepts 204', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => json(204, null))
    const { api } = clientWith(fetcher)
    expect((await api.post('/x', z.undefined(), { body: { a: 1 } })).ok).toBe(true)
    const init = fetcher.mock.calls[0]?.[1]
    expect(init?.body).toBe('{"a":1}')
    expect(init?.headers).toMatchObject({ 'content-type': 'application/json' })
  })
})

describe('parseDomainError', () => {
  it('keeps the extra fields of the codes that carry them', () => {
    expect(parseDomainError({ code: 'checkInCooldown', availableAt: '2026-10-01T16:00:00Z' })).toEqual({ code: 'checkInCooldown', availableAt: '2026-10-01T16:00:00Z' })
    expect(parseDomainError({ code: 'rewardNotReady', remaining: 2 })).toEqual({ code: 'rewardNotReady', remaining: 2 })
    expect(parseDomainError({ code: 'notFound', entity: 'card' })).toEqual({ code: 'notFound', entity: 'card' })
  })

  it('falls back to internal for unknown codes and malformed extras', () => {
    expect(parseDomainError({ code: 'weird' })).toEqual({ code: 'internal' })
    expect(parseDomainError({ code: 'checkInCooldown', availableAt: 'later' })).toEqual({ code: 'internal' })
    expect(parseDomainError(null)).toEqual({ code: 'internal' })
  })
})

describe('error narrowing', () => {
  it('allowing() lets declared codes and transport errors through and hides the rest', () => {
    const narrow = allowing('notFound')
    expect(narrow({ ok: false, error: { code: 'notFound', entity: 'card' } })).toEqual({ ok: false, error: { code: 'notFound', entity: 'card' } })
    expect(narrow({ ok: false, error: { code: 'rateLimited' } })).toEqual({ ok: false, error: { code: 'rateLimited' } })
    expect(narrow({ ok: false, error: { code: 'invalidShopQr' } })).toEqual({ ok: false, error: { code: 'internal' } })
  })

  it('transportOnly() hides every business code', () => {
    expect(transportOnly({ ok: false, error: { code: 'checkInDisabled' } })).toEqual({ ok: false, error: { code: 'internal' } })
    expect(transportOnly({ ok: true, value: 1 })).toEqual({ ok: true, value: 1 })
  })
})
