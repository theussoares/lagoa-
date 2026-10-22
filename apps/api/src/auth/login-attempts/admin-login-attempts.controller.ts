import { Body, Controller, Headers, HttpCode, Inject, Post, UnauthorizedException } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { type AdminLoginAttempt, AdminLoginAttemptSchema } from '#shared/schemas/admin'
import { BFF_SECRET_HEADER, isBffCaller } from '../../common/http/client-ip'
import { DomainException } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { FailClosedThrottle } from '../../throttling/fail-closed-throttle'
import { Public } from '../public.decorator'
import { LoginAttemptGate } from './login-attempt-gate'

/**
 * Chamado só pelo BFF do admin, antes de mandar e-mail e senha ao Supabase (lá o limite é por IP, e chega o IP do BFF).
 * Teto por e-mail, sem olhar se o e-mail é de alguém: a resposta não conta quem é admin. 204 = pode tentar; 429 = passou
 * do teto; 503 = o contador caiu e ninguém tenta sem ser contado.
 */
@Controller('auth/admin-login-attempts')
export class AdminLoginAttemptsController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'BFF_SHARED_SECRET'>,
    private readonly gate: LoginAttemptGate,
  ) {}

  @Public()
  @FailClosedThrottle()
  @Post()
  @HttpCode(204)
  async reserve(
    @Headers(BFF_SECRET_HEADER) presentedSecret: string | undefined,
    @Body(new ZodValidationPipe(AdminLoginAttemptSchema)) body: AdminLoginAttempt,
  ): Promise<void> {
    if (!isBffCaller(this.env.BFF_SHARED_SECRET, presentedSecret)) throw new UnauthorizedException()
    const verdict = await this.gate.reserveAdminLogin(body.email)
    if (verdict === 'refused') throw new ThrottlerException()
    if (verdict === 'unavailable') throw new DomainException({ code: 'network' })
  }
}
