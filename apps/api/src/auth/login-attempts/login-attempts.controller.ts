import { Body, Controller, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { BFF_SECRET_HEADER, isBffCaller } from '../../common/http/client-ip'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { Public } from '../public.decorator'
import { LoginAttemptGate } from './login-attempt-gate'

const LoginAttemptRequestSchema = z.object({ phone: PhoneNumberSchema })
type LoginAttemptRequest = z.infer<typeof LoginAttemptRequestSchema>

/**
 * Chamado só pelo BFF, antes de mandar o código de login ao Supabase: lá o limite é por IP e o IP que chega é o do
 * BFF. Aqui o teto é por celular. 204 = pode tentar; 429 = passou do teto (ou o contador caiu).
 */
@Controller('auth/login-attempts')
export class LoginAttemptsController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'BFF_SHARED_SECRET'>,
    private readonly gate: LoginAttemptGate,
  ) {}

  @Public()
  @Post()
  @HttpCode(204)
  async reserve(
    @Headers(BFF_SECRET_HEADER) presentedSecret: string | undefined,
    @Body(new ZodValidationPipe(LoginAttemptRequestSchema)) body: LoginAttemptRequest,
  ): Promise<void> {
    if (!isBffCaller(this.env.BFF_SHARED_SECRET, presentedSecret)) throw new UnauthorizedException()
    if (!(await this.gate.allow(body.phone))) throw new ThrottlerException()
  }
}
