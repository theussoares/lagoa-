import type { PhoneNumber } from '#shared/schemas/phone'
import type { OtpChannel } from '#shared/schemas/session'
import type { AuthOutcome } from '../types/auth'
import { buildUpstreamUrl } from './upstream'

const OTP_CHANNEL_PATH = '/auth/otp-channel'
const OTP_CHANNEL_TIMEOUT_MS = 5000

export type OtpChannelCheck = 'record' | 'skip' | 'refuse'

/**
 * Sem o segredo do BFF a API não aceita o registro do canal. Em produção isso é configuração quebrada: recusa (fail-closed).
 * Em desenvolvimento sem segredo deixa passar, e o hook da API entrega pelo canal padrão (WhatsApp).
 */
export function otpChannelCheck(bffSharedSecret: string, production: boolean): OtpChannelCheck {
  if (bffSharedSecret !== '') return 'record'
  return production ? 'refuse' : 'skip'
}

/** 204 = canal registrado; sem resposta = API fora do ar. */
export function otpChannelOutcome(status: number | null): AuthOutcome<true> {
  if (status === 204) return { ok: true, value: true }
  return { ok: false, code: status === null ? 'network' : 'internal' }
}

export interface OtpChannelTarget {
  readonly apiBaseUrl: string
  readonly bffSharedSecret: string
  readonly production: boolean
  readonly clientIp: string | undefined
}

/**
 * Registra na API o canal escolhido pela pessoa (WhatsApp ou SMS) para este celular, antes de pedir o código ao Supabase:
 * o Send SMS Hook do Supabase não repassa o canal, então o hook lê essa escolha na API.
 */
export async function recordOtpChannel(
  target: OtpChannelTarget,
  phone: PhoneNumber,
  channel: OtpChannel,
): Promise<AuthOutcome<true>> {
  const check = otpChannelCheck(target.bffSharedSecret, target.production)
  if (check === 'skip') return { ok: true, value: true }
  if (check === 'refuse') return { ok: false, code: 'internal' }
  const response = await fetch(buildUpstreamUrl({ baseUrl: target.apiBaseUrl, path: OTP_CHANNEL_PATH, search: '' }), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bff-secret': target.bffSharedSecret,
      ...(target.clientIp === undefined ? {} : { 'x-client-ip': target.clientIp }),
    },
    body: JSON.stringify({ phone, channel }),
    signal: AbortSignal.timeout(OTP_CHANNEL_TIMEOUT_MS),
  }).catch(() => null)
  return otpChannelOutcome(response?.status ?? null)
}
