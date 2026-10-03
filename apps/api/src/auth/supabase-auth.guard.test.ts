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

async function token(overrides: { key?: CryptoKey; alg?: string; issuer?: string; audience?: string; subject?: string | null; expiresIn?: string; email?: string } = {}): Promise<string> {
  const jwt = new SignJWT(overrides.email ? { email: overrides.email } : {})
    .setProtectedHeader({ alg: overrides.alg ?? 'ES256', kid: 'test' })
    .setIssuer(overrides.issuer ?? ISSUER)
    .setAudience(overrides.audience ?? 'authenticated')
    .setExpirationTime(overrides.expiresIn ?? '5m')
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
    expect(request.user).toEqual({ id: USER_ID, email: 'ana@example.com' })
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
    ['garbage', async () => 'Bearer abc.def.ghi'],
  ])('rejects %s', async (_name, header) => {
    await expect(guard.canActivate(contextFor(await header()).context)).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
