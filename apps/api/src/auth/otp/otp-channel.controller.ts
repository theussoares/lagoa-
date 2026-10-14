import { Body, Controller, Headers, HttpCode, Inject, Post, UnauthorizedException } from '@nestjs/common'
import { z } from 'zod'
import { PhoneNumberSchema } from '#shared/schemas/phone'
import { DEFAULT_OTP_CHANNEL, OtpChannelSchema } from '#shared/schemas/session'
import { BFF_SECRET_HEADER, isBffCaller } from '../../common/http/client-ip'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { Public } from '../public.decorator'
import { OtpChannelChoice } from './otp-channel-choice'

const OtpChannelRequestSchema = z.object({ phone: PhoneNumberSchema, channel: OtpChannelSchema.default(DEFAULT_OTP_CHANNEL) })
type OtpChannelRequest = z.infer<typeof OtpChannelRequestSchema>

/**
 * Chamado só pelo BFF, antes de pedir o código ao Supabase: o Send SMS Hook não recebe o canal, então a escolha da
 * pessoa (WhatsApp ou SMS) fica registrada aqui e o hook lê. Não conta no limite de envios: quem conta é o hook.
 */
@Controller('auth/otp-channel')
export class OtpChannelController {
  constructor(
    @Inject(ENV) private readonly env: Pick<Env, 'BFF_SHARED_SECRET'>,
    private readonly choice: OtpChannelChoice,
  ) {}

  @Public()
  @Post()
  @HttpCode(204)
  async choose(
    @Headers(BFF_SECRET_HEADER) presentedSecret: string | undefined,
    @Body(new ZodValidationPipe(OtpChannelRequestSchema)) body: OtpChannelRequest,
  ): Promise<void> {
    if (!isBffCaller(this.env.BFF_SHARED_SECRET, presentedSecret)) throw new UnauthorizedException()
    await this.choice.choose(body.phone, body.channel)
  }
}
