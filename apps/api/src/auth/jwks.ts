import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose'
import type { Env } from '../config/env'

export const JWKS = Symbol('JWKS')
export type Jwks = JWTVerifyGetKey

export const SUPABASE_AUDIENCE = 'authenticated'
export const supabaseIssuer = (env: Pick<Env, 'SUPABASE_URL'>): string => `${env.SUPABASE_URL}/auth/v1`

export function createSupabaseJwks(env: Pick<Env, 'SUPABASE_URL'>): Jwks {
  return createRemoteJWKSet(new URL(`${supabaseIssuer(env)}/.well-known/jwks.json`))
}
