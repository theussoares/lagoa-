import { Inject, Injectable } from '@nestjs/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { SmsSender } from './sms-sender'

const COMTELE_SEND_URL = 'https://api.comtele.com.br/messages/sms/send'
const BRAZIL_COUNTRY_CODE = '55'
const SEND_TIMEOUT_MS = 8_000
/** Rótulo que a Comtele guarda no relatório de envios (sem dado pessoal). */
const SEND_TAG = 'lagoa-login'

@Injectable()
export class ComteleSmsSender extends SmsSender {
  constructor(@Inject(ENV) private readonly env: Pick<Env, 'COMTELE_AUTH_KEY' | 'COMTELE_ROUTE'>) {
    super()
  }

  async send(phone: PhoneNumber, message: string): Promise<boolean> {
    if (this.env.COMTELE_AUTH_KEY === undefined) return false
    try {
      const response = await fetch(COMTELE_SEND_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': this.env.COMTELE_AUTH_KEY },
        body: JSON.stringify({
          receivers: [`${BRAZIL_COUNTRY_CODE}${phone}`],
          contactGroups: [],
          message,
          route: this.env.COMTELE_ROUTE,
          tag: SEND_TAG,
          custom: SEND_TAG,
        }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })
      if (!response.ok) return false
      const body: unknown = await response.json().catch(() => null)
      return typeof body === 'object' && body !== null && 'hasError' in body && body.hasError === false
    } catch {
      return false
    }
  }
}
