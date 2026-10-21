import { UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { createLocalJWKSet, exportJWK, generateKeyPair, type JWK, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import type { AuthenticatedRequest } from './auth.types'
import { IS_PUBLIC } from './public.decorator'
import { SupabaseAuthGuard } from './supabase-auth.guard'

const env = { SUPABASE_URL: 'https://project.supabase.co' }
const ISSUER = 'https://project.supabase.co/auth/v1'
const USER_ID = '0190a000-0000-7000-8000-000000000001'

let guard: SupabaseAuthGuard
let privateKey: CryptoKey
let strangerKey: CryptoKey

async function token(overrides: { key?: CryptoKey; alg?: string; issuer?: string; audience?: string; subject?: string | null; expiresIn?: string | null; email?: string; phone?: string; anonymous?: boolean; claims?: Record<string, unknown> } = {}): Promise<string> {
  const jwt = new SignJWT({ ...overrides.claims, ...(overrides.email !== undefined && { email: overrides.email }), ...(overrides.phone !== undefined && { phone: overrides.phone }), ...(overrides.anonymous && { is_anonymous: true }) })
    .setProtectedHeader({ alg: overrides.alg ?? 'ES256', kid: 'test' })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? 'authenticated')
  if (overrides.expiresIn !== null) jwt.setExpirationTime(overrides.expiresIn ?? '5m')
  if (overrides.subject !== null) jwt.setSubject(overrides.subject ?? USER_ID)
  return jwt.sign(overrides.key ?? privateKey)
}

function contextFor(authorization: string | undefined, isPublic = false): { context: ExecutionContextHost; request: Partial<AuthenticatedRequest> } {
  const request: Partial<AuthenticatedRequest> = { headers: { authorization } }
  const handler = (): void => undefined
  if (isPublic) Reflect.defineMetadata(IS_PUBLIC, true, handler)
  const context = new ExecutionContextHost([request, {}, () => undefined], class {}, handler)
  return { context, request }
}

describe('SupabaseAuthGuard', () => {
  beforeAll(async () => {
    const pair = await generateKeyPair('ES256')
    privateKey = pair.privateKey
    strangerKey = (await generateKeyPair('ES256')).privateKey
    const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'ES256' }
    guard = new SupabaseAuthGuard(env, createLocalJWKSet({ keys: [publicJwk] }), new Reflector())
  })

  it('accepts a valid token and exposes the user id and e-mail', async () => {
    const { context, request } = contextFor(`Bearer ${await token({ email: 'ana@example.com' })}`)
    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user).toEqual({ id: USER_ID, email: 'ana@example.com', phone: undefined, role: null, aal: null })
  })

  it('exposes the SMS-verified phone as 11 national digits, and ignores a junk claim', async () => {
    const verified = contextFor(`Bearer ${await token({ phone: '5567991230374' })}`)
    await guard.canActivate(verified.context)
    expect(verified.request.user).toEqual({ id: USER_ID, email: undefined, phone: '67991230374', role: null, aal: null })
    const junk = contextFor(`Bearer ${await token({ phone: '123' })}`)
    await guard.canActivate(junk.context)
    expect(junk.request.user?.phone).toBeUndefined()
  })

  it('reads the admin role only from app_metadata and the aal claim', async () => {
    const admin = contextFor(`Bearer ${await token({ claims: { app_metadata: { provider: 'email', role: 'admin' }, aal: 'aal2' } })}`)
    await guard.canActivate(admin.context)
    expect(admin.request.user).toMatchObject({ role: 'admin', aal: 'aal2' })
    const withoutMfa = contextFor(`Bearer ${await token({ claims: { app_metadata: { role: 'admin' }, aal: 'aal1' } })}`)
    await guard.canActivate(withoutMfa.context)
    expect(withoutMfa.request.user).toMatchObject({ role: 'admin', aal: 'aal1' })
  })

  it.each([
    ['a top-level role claim', { role: 'admin' }],
    ['user_metadata, which the user can write', { user_metadata: { role: 'admin' } }],
    ['another role in app_metadata', { app_metadata: { role: 'Admin' } }],
    ['app_metadata that is not an object', { app_metadata: 'admin' }],
    ['an unknown aal', { app_metadata: {}, aal: 'aal3' }],
  ])('gives no role and no known aal for %s', async (_name, claims) => {
    const { context, request } = contextFor(`Bearer ${await token({ claims })}`)
    await guard.canActivate(context)
    expect(request.user).toMatchObject({ role: null, aal: null })
  })

  it('lets @Public() routes through without a token', async () => {
    await expect(guard.canActivate(contextFor(undefined, true).context)).resolves.toBe(true)
  })

  it.each([
    ['missing header', async () => undefined],
    ['not a bearer scheme', async () => `Basic ${await token()}`],
    ['signed by another key', async () => `Bearer ${await token({ key: strangerKey })}`],
    ['wrong issuer', async () => `Bearer ${await token({ issuer: 'https://evil.example/auth/v1' })}`],
    ['wrong audience', async () => `Bearer ${await token({ audience: 'service_role' })}`],
    ['expired', async () => `Bearer ${await token({ expiresIn: '-1m' })}`],
    ['no subject', async () => `Bearer ${await token({ subject: null })}`],
    ['symmetric HS256 signed with the public key material', async () => `Bearer ${await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setIssuer(ISSUER).setAudience('authenticated').setSubject(USER_ID).setExpirationTime('5m').sign(new TextEncoder().encode('any-shared-secret-of-sufficient-length-32'))}`],
    ['no expiration claim', async () => `Bearer ${await token({ expiresIn: null })}`],
    ['subject that is not a uuid', async () => `Bearer ${await token({ subject: 'admin' })}`],
    ['anonymous user', async () => `Bearer ${await token({ anonymous: true })}`],
    ['garbage', async () => 'Bearer abc.def.ghi'],
  ])('rejects %s', async (_name, header) => {
    await expect(guard.canActivate(contextFor(await header()).context)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('treats an empty or malformed e-mail claim as "no e-mail", so the customer cannot register without one', async () => {
    for (const email of ['', 'not-an-email']) {
      const { context, request } = contextFor(`Bearer ${await token({ email })}`)
      await guard.canActivate(context)
      expect(request.user).toEqual({ id: USER_ID, email: undefined, phone: undefined, role: null, aal: null })
    }
  })
})
