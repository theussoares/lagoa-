import { Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common'
import { Inject } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { parsePhoneNumber } from '#shared/utils/phone'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { Public } from '../public.decorator'
import { SmsSender } from './sms-sender'
import { isValidWebhook } from './standard-webhook'

const HookPayloadSchema = z.object({ user: z.object({ phone: z.string() }), sms: z.object({ otp: z.string().regex(/^\d{4,10}$/) }) })

const hookError = (httpCode: number, message: string) => ({ error: { http_code: httpCode, message } })

/** Chamado só pelo Supabase Auth (Send SMS Hook): é ele quem gera o código; aqui só entregamos pela Comtele. */
@Controller('auth/hooks')
export class SendSmsHookController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'SEND_SMS_HOOK_SECRET'>,
    private readonly sms: SmsSender,
  ) {}

  @Public()
  @Post('send-sms')
  @HttpCode(200)
  async sendSms(@Req() request: RawBodyRequest<Request>): Promise<Record<string, never> | ReturnType<typeof hookError>> {
    const secret = this.env.SEND_SMS_HOOK_SECRET
    const rawBody = request.rawBody
    const signed =
      secret !== undefined &&
      rawBody !== undefined &&
      isValidWebhook(
        secret,
        { id: request.header('webhook-id'), timestamp: request.header('webhook-timestamp'), signature: request.header('webhook-signature') },
        rawBody,
      )
    if (!signed) throw new UnauthorizedException()

    const payload = HookPayloadSchema.safeParse(request.body)
    const phone = payload.success ? parsePhoneNumber(payload.data.user.phone) : null
    if (!payload.success || phone === null || !phone.ok) return hookError(400, 'invalid payload')

    const sent = await this.sms.send(phone.value, `Lagoa+: seu código é ${payload.data.sms.otp}. Não compartilhe com ninguém.`)
    return sent ? {} : hookError(502, 'sms provider failed')
  }
}
