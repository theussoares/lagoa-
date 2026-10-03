import type { PhoneNumber } from '#shared/schemas/phone'
import type { CustomerSession, LoginChallenge, LoginCode, MerchantSignInResult } from '#shared/schemas/session'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type SignInError = ErrorOf<'invalidLoginCode' | 'loginCodeExpired'> | TransportError
export type MerchantSignInError = SignInError | ErrorOf<'shopSuspended'>

/** Login por celular + código de 6 dígitos (cliente e lojista). */
export interface AuthService {
  requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>>
  signInCustomer(phone: PhoneNumber, code: LoginCode): Promise<Result<CustomerSession, SignInError>>
  /** Celular sem loja não é erro: devolve um ticket para o Criar o clube. */
  signInMerchant(phone: PhoneNumber, code: LoginCode): Promise<Result<MerchantSignInResult, MerchantSignInError>>
}
