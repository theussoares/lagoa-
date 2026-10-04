import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { ComteleSmsSender } from './comtele-sms-sender'

const PHONE = PhoneNumberSchema.parse('67991230374')
const sender = new ComteleSmsSender({ COMTELE_AUTH_KEY: 'key', COMTELE_ROUTE: 17 })

function respond(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

afterEach(() => vi.restoreAllMocks())

describe('ComteleSmsSender', () => {
  it('sends the 55-prefixed phone with the API key header and accepts hasError=false', async () => {
    const spy = respond(200, { hasError: false })
    expect(await sender.send(PHONE, 'Lagoa+: 123456')).toBe(true)
    const [url, init] = spy.mock.calls[0] ?? []
    expect(url).toBe('https://api.comtele.com.br/messages/sms/send')
    expect(init?.headers).toMatchObject({ 'x-api-key': 'key' })
    expect(JSON.parse(String(init?.body))).toMatchObject({ receivers: ['5567991230374'], message: 'Lagoa+: 123456', route: 17 })
  })

  it.each([
    ['hasError', 200, { hasError: true }],
    ['a provider error status', 401, { hasError: true }],
    ['an unexpected body', 200, { ok: true }],
  ])('reports failure on %s', async (_name, status, body) => {
    respond(status, body)
    expect(await sender.send(PHONE, 'x')).toBe(false)
  })

  it('reports failure when the request itself fails, and without a key', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    expect(await sender.send(PHONE, 'x')).toBe(false)
    expect(await new ComteleSmsSender({ COMTELE_AUTH_KEY: undefined, COMTELE_ROUTE: 17 }).send(PHONE, 'x')).toBe(false)
  })
})
