import { Injectable } from '@nestjs/common'
import { LOGIN_CODE_TTL_MINUTES } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { DEFAULT_OTP_CHANNEL, type OtpChannel } from '#shared/schemas/session'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { OtpChannelStore } from './otp-channel.store'

const CHOICE_TTL_MS = LOGIN_CODE_TTL_MINUTES * 60_000

/** Canal escolhido para o próximo código de cada celular. Sem escolha recente, vale o padrão (WhatsApp). */
@Injectable()
export class OtpChannelChoice {
  constructor(
    private readonly store: OtpChannelStore,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  async choose(phone: PhoneNumber, channel: OtpChannel): Promise<void> {
    await this.store.save(this.pii.hashPhone(phone), channel, this.clock.now())
  }

  /** Falha de leitura sobe: trocar de canal em silêncio entregaria o código por onde a pessoa não pediu. */
  async current(phone: PhoneNumber): Promise<OtpChannel> {
    const notBefore = new Date(this.clock.now().getTime() - CHOICE_TTL_MS)
    return (await this.store.find(this.pii.hashPhone(phone), notBefore)) ?? DEFAULT_OTP_CHANNEL
  }
}
