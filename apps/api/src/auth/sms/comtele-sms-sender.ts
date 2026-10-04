import { Inject, Injectable } from '@nestjs/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { SmsSender } from './sms-sender'

const COMTELE_SEND_URL = 'https://sms.comtele.com.br/api/v2/send'
const SEND_TIMEOUT_MS = 8_000

@Injectable()
export class ComteleSmsSender extends SmsSender {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'COMTELE_AUTH_KEY' | 'COMTELE_SENDER'>) {
    super()
  }

  async send(phone: PhoneNumber, message: string): Promise<boolean> {
    if (this.env.COMTELE_AUTH_KEY === undefined) return false
    try {
      const response = await fetch(COMTELE_SEND_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'auth-key': this.env.COMTELE_AUTH_KEY },
        body: JSON.stringify({ Sender: this.env.COMTELE_SENDER, Receivers: phone, Content: message }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })
      if (!response.ok) return false
      const body: unknown = await response.json().catch(() => null)
      return typeof body === 'object' && body !== null && 'Success' in body ? body.Success === true : true
    } catch {
      return false
    }
  }
}
