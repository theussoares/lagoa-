import { describe, expect, it, vi } from 'vitest'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { LoginCodeSchema } from '#shared/schemas/session'
import type { SignInError } from '#layers/core/app/services/AuthService'
import { HttpAuthService } from '#layers/core/app/services/HttpAuthService'
import type { PhoneAuthGateway } from '#layers/core/app/services/PhoneAuthGateway'
import { ApiClient } from '#layers/core/app/services/http/ApiClient'
import type { Result } from '#shared/types/result'

const PHONE = PhoneNumberSchema.parse('67991230374')
const CODE = LoginCodeSchema.parse('123456')
const CUSTOMER_ID = '0190a000-0000-7000-8000-000000000001'
const NOW = new Date('2026-10-01T16:00:00Z')

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function setup(verify: Result<true, SignInError>, routes: Record<string, () => Response>) {
  const gateway: PhoneAuthGateway = {
    sendCode: vi.fn(async () => ({ ok: true as const, value: true as const })),
    verifyCode: vi.fn(async () => verify),
    signOut: vi.fn(async () => ({ ok: true as const, value: true as const })),
  }
  const calls: string[] = []
  const fetcher: typeof fetch = async (input, init) => {
    const key = `${init?.method ?? 'GET'} ${String(input).replace('https://api.test/v1', '')}`
    calls.push(key)
    const route = routes[key]
    return route === undefined ? json(500, { code: 'internal' }) : route()
  }
  const api = new ApiClient({ baseUrl: 'https://api.test/v1', fetcher, onUnauthorized: () => {} })
  return { gateway, calls, auth: new HttpAuthService(gateway, api, () => NOW) }
}

describe('HttpAuthService', () => {
  it('asks for the code and reports when it expires', async () => {
    const { auth, gateway } = setup({ ok: true, value: true }, {})
    const result = await auth.requestLoginCode(PHONE)
    expect(gateway.sendCode).toHaveBeenCalledWith(PHONE)
    expect(result).toEqual({ ok: true, value: { expiresAt: '2026-10-01T16:05:00.000Z' } })
  })

  it('signs in an existing customer with the session of the API', async () => {
    const session = { role: 'customer', customerId: CUSTOMER_ID, isNewCustomer: false }
    const { auth, calls } = setup({ ok: true, value: true }, { 'GET /session': () => json(200, session) })
    expect(await auth.signInCustomer(PHONE, CODE)).toEqual({ ok: true, value: { kind: 'signedIn', session } })
    expect(calls).toEqual(['GET /session'])
  })

  it('does not register a first-time customer on its own: it asks for the sign-up details', async () => {
    const { auth, calls } = setup(
      { ok: true, value: true },
      { 'GET /session': () => json(404, { code: 'notFound', entity: 'customer' }) },
    )
    expect(await auth.signInCustomer(PHONE, CODE)).toEqual({ ok: true, value: { kind: 'signUp' } })
    expect(calls).toEqual(['GET /session'])
  })

  it('registers with the name and the optional e-mail (the phone comes from the token)', async () => {
    const session = { role: 'customer', customerId: CUSTOMER_ID, isNewCustomer: true }
    const { auth, calls } = setup({ ok: true, value: true }, { 'POST /registration': () => json(200, session) })
    expect(await auth.registerCustomer({ firstName: 'Ana' })).toEqual({ ok: true, value: session })
    expect(calls).toEqual(['POST /registration'])
  })

  it('reports an e-mail that belongs to another account', async () => {
    const { auth } = setup({ ok: true, value: true }, { 'POST /registration': () => json(409, { code: 'emailAlreadyUsed' }) })
    expect(await auth.registerCustomer({ firstName: 'Ana', email: 'ana@example.com' })).toEqual({
      ok: false,
      error: { code: 'emailAlreadyUsed' },
    })
  })

  it('does not call the API when the code is wrong', async () => {
    const { auth, calls } = setup({ ok: false, error: { code: 'invalidLoginCode' } }, {})
    expect(await auth.signInCustomer(PHONE, CODE)).toEqual({ ok: false, error: { code: 'invalidLoginCode' } })
    expect(calls).toEqual([])
  })

  it('signs out of the provider', async () => {
    const { auth, gateway } = setup({ ok: true, value: true }, {})
    await auth.signOut()
    expect(gateway.signOut).toHaveBeenCalledOnce()
  })
})
