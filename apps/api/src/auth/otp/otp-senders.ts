import { Injectable } from '@nestjs/common'
import type { OtpChannel } from '#shared/schemas/session'
import { ComteleSmsSender } from './comtele-sms-sender'
import { OtpSender } from './otp-sender'
import { WhatsAppOtpSender } from './whatsapp-otp-sender'

/** Escolhe o provedor pelo canal pedido. Não existe fallback: o canal escolhido é o único tentado. */
@Injectable()
export class OtpSenders {
  constructor(
    private readonly whatsapp: WhatsAppOtpSender,
    private readonly sms: ComteleSmsSender,
  ) {}

  for(channel: OtpChannel): OtpSender {
    return channel === 'sms' ? this.sms : this.whatsapp
  }
}
