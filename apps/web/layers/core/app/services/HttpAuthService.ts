import type { PhoneNumber } from '#shared/schemas/phone'
import { IsoDateTimeSchema } from '#shared/schemas/common'
import { CustomerSessionSchema, type CustomerSession, type LoginChallenge, type LoginCode } from '#shared/schemas/session'
import { LOGIN_CODE_TTL_MINUTES } from '#shared/constants/domain'
import type { TransportError } from '#shared/types/errors'
import { ok, type Result } from '#shared/types/result'
import type { AuthService, SignInError } from './AuthService'
import type { PhoneAuthGateway } from './PhoneAuthGateway'
import { allowing, type ApiClient } from './http/ApiClient'

const MS_PER_MINUTE = 60_000

/**
 * Cliente: celular + SMS (Supabase, no servidor do Nuxt) e depois a sessão da API; primeiro acesso cadastra na hora,
 * sem corpo: o celular vem do token.
 */
export class HttpAuthService implements AuthService {
  constructor(
    private readonly gateway: PhoneAuthGateway,
    private readonly api: ApiClient,
    private readonly now: () => Date,
  ) {}

  async requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>> {
    const sent = await this.gateway.sendCode(phone)
    if (!sent.ok) return sent
    return ok({ expiresAt: IsoDateTimeSchema.parse(new Date(this.now().getTime() + LOGIN_CODE_TTL_MINUTES * MS_PER_MINUTE).toISOString()) })
  }

  async signInCustomer(phone: PhoneNumber, code: LoginCode): Promise<Result<CustomerSession, SignInError>> {
    const verified = await this.gateway.verifyCode(phone, code)
    if (!verified.ok) return verified
    const session = await this.api.get('/session', CustomerSessionSchema)
    if (session.ok) return session
    if (session.error.code !== 'notFound') return allowing('invalidLoginCode', 'loginCodeExpired')(session)
    return allowing('invalidLoginCode', 'loginCodeExpired')(await this.api.post('/registration', CustomerSessionSchema, { body: {} }))
  }

  signOut(): Promise<void> {
    return this.gateway.signOut()
  }
}
