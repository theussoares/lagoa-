import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { Result } from '#shared/types/result'
import type { SignInError } from './AuthService'
import type { TransportError } from '#shared/types/errors'

/** Provedor do login por celular (hoje o Supabase Auth, atrás do BFF do Nuxt): manda o SMS, confere o código e abre a sessão (cookie httpOnly, que o navegador nem lê). */
export interface PhoneAuthGateway {
  sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>>
  verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>>
  signOut(): Promise<void>
}
