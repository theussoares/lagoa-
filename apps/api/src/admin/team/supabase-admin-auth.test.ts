import { Logger } from '@nestjs/common'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseAdminAuth } from './supabase-admin-auth'

const URL_BASE = 'https://project.supabase.co'
const KEY = 'service-role-test-key'
const EMAIL = 'ana@rede.test'
const USER = '0190a000-0000-7000-8000-00000000a009'

interface Call {
  readonly method: string
  readonly url: string
  readonly body: unknown
  readonly authorization: string | null
}

type Responder = (call: Call) => Response

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function headerOf(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name)
}

/** Troca o `fetch` global por um roteiro e anota cada chamada (método, caminho, corpo). */
function scriptFetch(responder: Responder): Call[] {
  const calls: Call[] = []
  vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input).replace(`${URL_BASE}/auth/v1`, ''),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      authorization: headerOf(init, 'authorization'),
    }
    calls.push(call)
    return responder(call)
  })
  return calls
}

describe('SupabaseAdminAuth', () => {
  const auth = new SupabaseAdminAuth({ SUPABASE_URL: `${URL_BASE}/`, SUPABASE_SERVICE_ROLE_KEY: KEY, ADMIN_APP_URL: undefined })
  let logged: string[]

  beforeEach(() => {
    logged = []
    for (const level of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, level).mockImplementation((message: unknown) => {
        logged.push(String(message))
      })
    }
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('invite', () => {
    it('creates the account already marked admin, then sends the invite to that same account', async () => {
      const calls = scriptFetch((call) => (call.url === '/admin/users' ? json(200, { id: USER }) : json(200, { id: USER })))
      expect(await auth.invite(EMAIL, 'Ana')).toEqual({ ok: true, value: { userId: USER } })
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['POST /admin/users', 'POST /invite'])
      // O papel nasce com a conta: não existe instante em que ela tenha token sem `role: admin`.
      expect(calls[0]?.body).toEqual({ email: EMAIL, app_metadata: { role: 'admin' }, user_metadata: { name: 'Ana' } })
      expect(calls[1]?.body).toEqual({ email: EMAIL })
      expect(calls.every((call) => call.authorization === `Bearer ${KEY}`)).toBe(true)
    })

    it('sends the invite link to the admin app set-password page when ADMIN_APP_URL is set', async () => {
      const calls = scriptFetch(() => json(200, { id: USER }))
      const withApp = new SupabaseAdminAuth({ SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY, ADMIN_APP_URL: 'https://admin.lagoamais.com.br/' })
      expect((await withApp.invite(EMAIL, 'Ana')).ok).toBe(true)
      const invite = new URL(`${URL_BASE}${calls[1]?.url ?? ''}`)
      expect(invite.pathname).toBe('/invite')
      expect(invite.searchParams.get('redirect_to')).toBe('https://admin.lagoamais.com.br/definir-senha')
      // O e-mail vai só no corpo, nunca na URL.
      expect(calls[1]?.url).not.toContain('ana')
    })

    it('refuses an e-mail that already has any account (never promotes it) and sends no invite', async () => {
      const calls = scriptFetch(() => json(422, { code: 422, error_code: 'email_exists', msg: 'A user with this email address has already been registered' }))
      expect(await auth.invite(EMAIL, 'Ana')).toEqual({ ok: false, error: { code: 'alreadyExists' } })
      expect(calls.map((call) => call.url)).toEqual(['/admin/users'])
    })

    it('removes the account it just created when the invite e-mail fails', async () => {
      const calls = scriptFetch((call) => {
        if (call.url === '/admin/users') return json(200, { id: USER })
        if (call.url === '/invite') return json(500, { error_code: 'unexpected_failure' })
        return json(200, {})
      })
      expect(await auth.invite(EMAIL, 'Ana')).toEqual({ ok: false, error: { code: 'network' } })
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual(['POST /admin/users', 'POST /invite', `DELETE /admin/users/${USER}`])
    })

    it('answers network when Supabase fails or answers out of contract', async () => {
      scriptFetch(() => json(503, {}))
      expect(await auth.invite(EMAIL, 'Ana')).toEqual({ ok: false, error: { code: 'network' } })
      scriptFetch(() => json(200, { id: 'not-a-uuid' }))
      expect(await auth.invite(EMAIL, 'Ana')).toEqual({ ok: false, error: { code: 'network' } })
    })

    it('never writes the e-mail to the log', async () => {
      scriptFetch((call) => (call.url === '/invite' ? json(500, {}) : json(200, { id: USER })))
      await auth.invite(EMAIL, 'Ana')
      expect(logged.length).toBeGreaterThan(0)
      expect(logged.join('\n')).not.toContain('ana@')
    })

    it('is off without the service role key', async () => {
      const calls = scriptFetch(() => json(200, { id: USER }))
      const keyless = new SupabaseAdminAuth({ SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: undefined, ADMIN_APP_URL: undefined })
      expect(await keyless.invite(EMAIL, 'Ana')).toEqual({ ok: false, error: { code: 'network' } })
      expect(await keyless.deleteMfaFactors(USER)).toEqual({ ok: false, error: { code: 'network' } })
      expect(calls).toEqual([])
    })
  })

  describe('deleteMfaFactors', () => {
    it('deletes every TOTP factor of the user, and only those', async () => {
      const calls = scriptFetch((call) =>
        call.method === 'GET'
          ? json(200, [
              { id: 'f-1', factor_type: 'totp', status: 'verified' },
              { id: 'f-2', factor_type: 'totp', status: 'unverified' },
              { id: 'f-3', factor_type: 'phone', status: 'verified' },
            ])
          : json(200, {}),
      )
      expect(await auth.deleteMfaFactors(USER)).toEqual({ ok: true, value: undefined })
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
        `GET /admin/users/${USER}/factors`,
        `DELETE /admin/users/${USER}/factors/f-1`,
        `DELETE /admin/users/${USER}/factors/f-2`,
      ])
    })

    it('counts a factor that is already gone as deleted', async () => {
      scriptFetch((call) => (call.method === 'GET' ? json(200, [{ id: 'f-1', factor_type: 'totp' }]) : json(404, { error_code: 'mfa_factor_not_found' })))
      expect(await auth.deleteMfaFactors(USER)).toEqual({ ok: true, value: undefined })
    })

    it('answers network when a delete fails, so the reset is not recorded as done', async () => {
      scriptFetch((call) => (call.method === 'GET' ? json(200, [{ id: 'f-1', factor_type: 'totp' }]) : json(500, {})))
      expect(await auth.deleteMfaFactors(USER)).toEqual({ ok: false, error: { code: 'network' } })
      scriptFetch(() => json(404, { error_code: 'user_not_found' }))
      expect(await auth.deleteMfaFactors(USER)).toEqual({ ok: false, error: { code: 'network' } })
    })
  })

  describe('cancelInvite', () => {
    it('deletes the account by id', async () => {
      const calls = scriptFetch(() => json(200, {}))
      await auth.cancelInvite(USER)
      expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([`DELETE /admin/users/${USER}`])
    })
  })
})
