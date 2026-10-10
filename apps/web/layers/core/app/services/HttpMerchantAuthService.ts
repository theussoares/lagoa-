import type { PhoneNumber } from '#shared/schemas/phone'
import { IsoDateTimeSchema } from '#shared/schemas/common'
import { MerchantSessionSchema, type LoginChallenge, type LoginCode, type MerchantSession, type MerchantSignInResult } from '#shared/schemas/session'
import { LOGIN_CODE_TTL_MINUTES } from '#shared/constants/domain'
import type { TransportError } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import type { MerchantAuthService, MerchantSessionError, MerchantSignInError } from './AuthService'
import type { PhoneAuthGateway } from './PhoneAuthGateway'
import { allowing, type ApiClient } from './http/ApiClient'

const MS_PER_MINUTE = 60_000

/**
 * Lojista: o mesmo celular + SMS do cliente (Supabase, no servidor do Nuxt). Depois do código, `GET /merchant/session`
 * diz se já existe loja (`session`) ou se falta criar o clube (`signUp`); o cookie da sessão identifica o dono.
 */
export class HttpMerchantAuthService implements MerchantAuthService {
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

  async signInMerchant(phone: PhoneNumber, code: LoginCode): Promise<Result<MerchantSignInResult, MerchantSignInError>> {
    const verified = await this.gateway.verifyCode(phone, code)
    if (!verified.ok) return verified
    const session = await this.currentSession()
    if (session.ok) return ok({ kind: 'session', session: session.value })
    if (session.error.code === 'notFound') return ok({ kind: 'signUp' })
    // Código aceito mas sem sessão: o cookie não pegou. Não é culpa do código digitado.
    return err(session.error.code === 'unauthorized' ? { code: 'internal' } : session.error)
  }

  async currentSession(): Promise<Result<MerchantSession, MerchantSessionError>> {
    return allowing('notFound', 'unauthorized')(await this.api.get('/merchant/session', MerchantSessionSchema))
  }

  signOut(): Promise<void> {
    return this.gateway.signOut()
  }
}
