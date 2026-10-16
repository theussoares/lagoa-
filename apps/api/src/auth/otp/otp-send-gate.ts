import { Injectable } from '@nestjs/common'
import { OTP_SENDS_MAX_PER_WINDOW } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { Clock } from '../../common/clock'
import { PiiService } from '../../common/pii.service'
import { OtpSendLog } from './otp-send-log.repository'
import { otpWindowStart } from './otp-send-limit.rules'

/** Decide se este celular ainda pode receber um código de login agora. */
@Injectable()
export class OtpSendGate {
  constructor(
    private readonly log: OtpSendLog,
    private readonly pii: PiiService,
    private readonly clock: Clock,
  ) {}

  async allow(phone: PhoneNumber): Promise<boolean> {
    const now = this.clock.now()
    try {
      return await this.log.tryRecord(this.pii.hashPhone(phone), now, otpWindowStart(now), OTP_SENDS_MAX_PER_WINDOW)
    } catch {
      // Sem o registro o limite não funciona, mas o login não pode parar por isso: melhor deixar enviar.
      return true
    }
  }
}
