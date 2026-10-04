import { type CanActivate, type ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { jwtVerify } from 'jose'
import { z } from 'zod'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import type { AuthenticatedRequest } from './auth.types'
import { JWKS, type Jwks, SUPABASE_AUDIENCE, supabaseIssuer } from './jwks'
import { IS_PUBLIC } from './public.decorator'

const ACCEPTED_ALGORITHMS = ['ES256', 'RS256']
const UserIdSchema = z.uuid()

/** E-mail do token só vale se for um endereço de verdade (vazio ou lixo vira "sem e-mail"). */
function verifiedEmail(claim: unknown): string | undefined {
  const parsed = z.email().safeParse(claim)
  return parsed.success ? parsed.data : undefined
}

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
        // O jose só confere a expiração se ela existir: token sem `exp` ou `sub` não entra.
        requiredClaims: ['exp', 'sub'],
      })
      // Id do Supabase é UUID; conta anônima (sem e-mail verificado) não vira cliente.
      if (!UserIdSchema.safeParse(payload.sub).success || payload.is_anonymous === true) throw new UnauthorizedException()
      request.user = { id: String(payload.sub), email: verifiedEmail(payload.email) }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [context.getHandler(), context.getClass()]) === true
  }
}
