import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { jwtVerify } from 'jose'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import type { AuthenticatedRequest } from './auth.types'
import { JWKS, type Jwks, SUPABASE_AUDIENCE, supabaseIssuer } from './jwks'
import { IS_PUBLIC } from './public.decorator'

const ACCEPTED_ALGORITHMS = ['ES256', 'RS256']

/** Valida o JWT do Supabase Auth (chaves assimétricas, via JWKS público); `sub` é o `app_users.id`. */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly issuer: string

  constructor(
    @Inject(ENV) env: Pick<Env, 'SUPABASE_URL'>,
    @Inject(JWKS) private readonly jwks: Jwks,
    private readonly reflector: Reflector,
  ) {
    this.issuer = supabaseIssuer(env)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
    if (token === undefined) throw new UnauthorizedException()
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: SUPABASE_AUDIENCE,
        algorithms: ACCEPTED_ALGORITHMS,
      })
      if (!payload.sub) throw new UnauthorizedException()
      request.user = { id: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [context.getHandler(), context.getClass()]) === true
  }
}
