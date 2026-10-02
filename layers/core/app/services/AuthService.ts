import type { PhoneNumber } from '#shared/schemas/phone'
import type { CustomerSession, LoginChallenge, LoginCode, MerchantSession } from '#shared/schemas/session'
import type { ErrorOf, TransportError } from '#shared/types/errors'
import type { Result } from '#shared/types/result'

export type SignInError = ErrorOf<'invalidLoginCode' | 'loginCodeExpired'> | TransportError

/** Login por celular + código de 6 dígitos (cliente e lojista). */
export interface AuthService {
  requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>>
  signInCustomer(phone: PhoneNumber, code: LoginCode): Promise<Result<CustomerSession, SignInError>>
  signInMerchant(
    phone: PhoneNumber,
    code: LoginCode,
  ): Promise<Result<MerchantSession, SignInError | ErrorOf<'notFound'>>>
}
