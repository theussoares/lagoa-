import { Controller, HttpCode, Inject, Post, Req, UnauthorizedException } from '@nestjs/common'
import type { RawBodyRequest } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { OtpChannel } from '#shared/schemas/session'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { Public } from '../public.decorator'
import { OtpChannelChoice } from './otp-channel-choice'
import { OtpSendGate } from './otp-send-gate'
import { OtpSenders } from './otp-senders'
import { isValidWebhook } from './standard-webhook'

const HookPayloadSchema = z.object({
  user: z.object({ phone: z.string() }),
  sms: z.object({ otp: z.string().regex(/^\d{4,10}$/) }),
})

const hookError = (httpCode: number, message: string) => ({ error: { http_code: httpCode, message } })

/** Chamado só pelo Supabase Auth (Send SMS Hook, nome do Supabase): ele gera o código; aqui só entregamos, pelo canal que a pessoa escolheu (WhatsApp ou SMS). */
@Controller('auth/hooks')
export class SendSmsHookController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'SEND_SMS_HOOK_SECRET'>,
    private readonly senders: OtpSenders,
    private readonly channels: OtpChannelChoice,
    private readonly gate: OtpSendGate,
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

    // Antes do limite: se a leitura falhar, nada foi consumido e nada é entregue por outro canal.
    let channel: OtpChannel
    try {
      channel = await this.channels.current(phone.value)
    } catch {
      return hookError(502, 'code provider failed')
    }

    // Um só limite por celular para os dois canais: trocar de canal não zera a contagem.
    if (!(await this.gate.allow(phone.value))) return hookError(429, 'too many code requests')

    // Sem fallback: `throttled` ou `failed` do canal escolhido nunca cai para o outro.
    const result = await this.senders.for(channel).send(phone.value, payload.data.sms.otp)
    if (result === 'throttled') return hookError(429, 'too many code requests')
    return result === 'sent' ? {} : hookError(502, 'code provider failed')
  }
}
