import type { SupabaseClient } from '@supabase/supabase-js'
import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { AuthOutcome, TokenPair } from '../types/auth'
import { transportCodeOf, verifyErrorCodeOf } from './authErrors'

const BRAZIL_COUNTRY_CODE = '+55'

const toE164 = (phone: PhoneNumber): string => `${BRAZIL_COUNTRY_CODE}${phone}`

/** Login por celular + SMS no Supabase Auth. Só o servidor fala com ele: o navegador nunca vê o token. Uma instância por requisição (o cliente guarda sessão). */
export class PhoneLogin {
  constructor(private readonly supabase: SupabaseClient) {}

  async sendCode(phone: PhoneNumber): Promise<AuthOutcome<true>> {
    const { error } = await this.supabase.auth.signInWithOtp({ phone: toE164(phone), options: { channel: 'sms' } })
    return error === null ? { ok: true, value: true } : { ok: false, code: transportCodeOf(error) }
  }

  async verifyCode(phone: PhoneNumber, code: LoginCode): Promise<AuthOutcome<TokenPair>> {
    const { data, error } = await this.supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' })
    if (error !== null) return { ok: false, code: verifyErrorCodeOf(error) }
    return data.session === null ? { ok: false, code: 'internal' } : { ok: true, value: tokensOf(data.session) }
  }

  async refresh(refreshToken: string): Promise<AuthOutcome<TokenPair>> {
    const { data, error } = await this.supabase.auth.refreshSession({ refresh_token: refreshToken })
    if (error !== null) return { ok: false, code: transportCodeOf(error) }
    return data.session === null ? { ok: false, code: 'internal' } : { ok: true, value: tokensOf(data.session) }
  }

  /** Revoga a sessão no provedor; falhar aqui não impede de limpar os cookies. */
  async signOut(tokens: Pick<TokenPair, 'accessToken' | 'refreshToken'>): Promise<void> {
    const { error } = await this.supabase.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
    if (error === null) await this.supabase.auth.signOut()
  }
}

interface SessionLike {
  readonly access_token: string
  readonly refresh_token: string
  readonly expires_in: number
}

const tokensOf = (session: SessionLike): TokenPair => ({
  accessToken: session.access_token,
  refreshToken: session.refresh_token,
  expiresIn: session.expires_in,
})
