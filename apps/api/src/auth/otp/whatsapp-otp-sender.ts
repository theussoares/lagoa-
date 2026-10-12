import { Inject, Injectable, Logger } from '@nestjs/common'
import { z } from 'zod'
import type { PhoneNumber } from '#shared/schemas/phone'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { OtpSender, type OtpSendResult } from './otp-sender'

const GRAPH_URL = 'https://graph.facebook.com'
const BRAZIL_COUNTRY_CODE = '55'
/** O Supabase desiste do hook em ~5 s: 4 s deixa folga. Sem retry interno. */
const SEND_TIMEOUT_MS = 4_000

/** 131056 = muitos envios ao mesmo número: o usuário vê "espere um pouco" (429). */
const THROTTLED_CODES = new Set([131056])
/** Sem estes, ninguém loga: logar como erro para chamar atenção imediata. */
const CRITICAL_CODES = new Set([0, 100, 102, 190, 131042])

function isCritical(code: number): boolean {
  return CRITICAL_CODES.has(code) || (code >= 132000 && code <= 132016)
}

const AcceptedSchema = z.object({
  messages: z.array(z.object({ id: z.string().min(1) })).min(1),
})

const GraphErrorSchema = z.object({
  error: z.object({
    code: z.number(),
    type: z.string().optional(),
    fbtrace_id: z.string().optional(),
  }),
})

@Injectable()
export class WhatsAppOtpSender extends OtpSender {
  private readonly logger = new Logger(WhatsAppOtpSender.name)

  constructor(
    @Inject(ENV)
    private readonly env: Pick<
      Env,
      | 'WHATSAPP_ACCESS_TOKEN'
      | 'WHATSAPP_PHONE_NUMBER_ID'
      | 'WHATSAPP_TEMPLATE_NAME'
      | 'WHATSAPP_TEMPLATE_LANGUAGE'
      | 'WHATSAPP_GRAPH_VERSION'
    >,
  ) {
    super()
  }

  async send(phone: PhoneNumber, code: string): Promise<OtpSendResult> {
    const { WHATSAPP_ACCESS_TOKEN: token, WHATSAPP_PHONE_NUMBER_ID: phoneNumberId } = this.env
    if (token === undefined || phoneNumberId === undefined) {
      this.logger.error('otp.whatsapp.notConfigured')
      return 'failed'
    }

    try {
      const response = await fetch(`${GRAPH_URL}/${this.env.WHATSAPP_GRAPH_VERSION}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(this.payload(phone, code)),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      })

      const body: unknown = await response.json().catch(() => null)
      if (response.ok && AcceptedSchema.safeParse(body).success) {
        return 'sent'
      }

      return this.rejected(response.status, body)
    } catch {
      this.logger.warn('otp.whatsapp.unreachable')
      return 'failed'
    }
  }

  /**
   * O código vai duas vezes: no corpo e no botão "Copiar código" (sub_type: url, índice 0) — exigência da Meta
   * para templates AUTHENTICATION com botão OTP / COPY_CODE.
   */
  private payload(phone: PhoneNumber, code: string) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: `${BRAZIL_COUNTRY_CODE}${phone}`,
      type: 'template',
      template: {
        name: this.env.WHATSAPP_TEMPLATE_NAME,
        language: { code: this.env.WHATSAPP_TEMPLATE_LANGUAGE },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: code }] },
          { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
        ],
      },
    }
  }

  /**
   * Loga só status HTTP, código/tipo do erro e fbtrace_id (para o suporte da Meta).
   * NUNCA celular, código ou corpo da mensagem.
   */
  private rejected(status: number, body: unknown): OtpSendResult {
    const parsed = GraphErrorSchema.safeParse(body)
    const errorCode = parsed.success ? parsed.data.error.code : 0
    const errorType = parsed.success ? (parsed.data.error.type ?? '-') : '-'
    const fbtraceId = parsed.success ? (parsed.data.error.fbtrace_id ?? '-') : '-'
    const context = `otp.whatsapp.rejected status=${status} code=${errorCode} type=${errorType} fbtraceId=${fbtraceId}`

    if (isCritical(errorCode)) {
      this.logger.error(context)
    } else {
      this.logger.warn(context)
    }

    return THROTTLED_CODES.has(errorCode) ? 'throttled' : 'failed'
  }
}
