import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { TransportError } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { SignInError } from './AuthService'
import type { PhoneAuthGateway } from './PhoneAuthGateway'

const BRAZIL_COUNTRY_CODE = '+55'
const RATE_LIMIT_STATUS = 429

const toE164 = (phone: PhoneNumber): string => `${BRAZIL_COUNTRY_CODE}${phone}`

function isRateLimited(error: AuthError): boolean {
  return error.status === RATE_LIMIT_STATUS || (error.code ?? '').includes('rate_limit')
}

/** Sem `status` HTTP = o pedido nem chegou ao Supabase (rede). */
const isOffline = (error: AuthError): boolean => error.status === undefined || error.status === 0

function transportOf(error: AuthError): TransportError {
  if (isRateLimited(error)) return { code: 'rateLimited' }
  return isOffline(error) ? { code: 'network' } : { code: 'internal' }
}

export class SupabasePhoneAuthGateway implements PhoneAuthGateway {
  constructor(private readonly supabase: SupabaseClient) {}

  async sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>> {
    const { error } = await this.supabase.auth.signInWithOtp({ phone: toE164(phone), options: { channel: 'sms' } })
    return error === null ? ok(true) : err(transportOf(error))
  }

  async verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>> {
    const { error } = await this.supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' })
    if (error === null) return ok(true)
    if (isRateLimited(error) || isOffline(error)) return err(transportOf(error))
    return err({ code: error.code === 'otp_expired' ? 'loginCodeExpired' : 'invalidLoginCode' })
  }

  async accessToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession()
    return data.session?.access_token ?? null
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut()
  }
}
