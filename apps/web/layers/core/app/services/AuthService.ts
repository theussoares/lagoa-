import type { PhoneNumber } from '#shared/schemas/phone'
import type { CustomerSession, LoginChallenge, LoginCode, MerchantSignInResult } from '#shared/schemas/session'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type SignInError = ErrorOf<'invalidLoginCode' | 'loginCodeExpired'> | TransportError
export type MerchantSignInError = SignInError | ErrorOf<'shopSuspended'>

/** Login do cliente por celular + código de 6 dígitos (SMS). */
export interface AuthService {
  requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>>
  signInCustomer(phone: PhoneNumber, code: LoginCode): Promise<Result<CustomerSession, SignInError>>
  /** Encerra a sessão no servidor (cookie httpOnly); o app limpa a sessão local por conta própria. */
  signOut(): Promise<void>
}

/** Login do lojista (mock até a API do painel existir). */
export interface MerchantAuthService {
  requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>>
  /** Celular sem loja não é erro: devolve um ticket para o Criar o clube. */
  signInMerchant(phone: PhoneNumber, code: LoginCode): Promise<Result<MerchantSignInResult, MerchantSignInError>>
  signOut(): Promise<void>
}
