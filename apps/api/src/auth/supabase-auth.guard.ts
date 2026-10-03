import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import type { AuthenticatedRequest } from './auth.types'

/** Valida o JWT do Supabase Auth (chaves assimétricas, via JWKS público); `sub` é o `app_users.id`. */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>
  private readonly issuer: string

  constructor(@Inject(ENV) env: Env) {
    this.issuer = `${env.SUPABASE_URL}/auth/v1`
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`))
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!token) throw new UnauthorizedException()
    try {
      const { payload } = await jwtVerify(token, this.jwks, { issuer: this.issuer, audience: 'authenticated' })
      if (!payload.sub) throw new UnauthorizedException()
      request.user = { id: payload.sub }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
