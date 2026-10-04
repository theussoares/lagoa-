import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { Result } from '#shared/types/result'
import type { SignInError } from './AuthService'
import type { TransportError } from '#shared/types/errors'

/** Provedor do login por celular (hoje o Supabase Auth): manda o SMS, confere o código e guarda a sessão. */
export interface PhoneAuthGateway {
  sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>>
  verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>>
  /** Token de acesso vigente (renovado quando perto de vencer) ou `null` sem sessão. */
  accessToken(): Promise<string | null>
  signOut(): Promise<void>
}
