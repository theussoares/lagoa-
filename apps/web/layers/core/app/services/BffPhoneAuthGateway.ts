import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { DomainError, TransportError } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { parseDomainError, isTransportError } from '../utils/domainError'
import type { SignInError } from './AuthService'
import type { PhoneAuthGateway } from './PhoneAuthGateway'
import { BFF_AUTH_BASE } from './http/bffPaths'

/** Login pelo BFF do Nuxt: o servidor fala com o Supabase e guarda o token em cookie httpOnly. */
export class BffPhoneAuthGateway implements PhoneAuthGateway {
  constructor(private readonly fetcher: typeof fetch) {}

  async sendCode(phone: PhoneNumber): Promise<Result<true, TransportError>> {
    const failure = await this.post('otp', { phone })
    if (failure === null) return ok(true)
    return err(isTransportError(failure) ? failure : { code: 'internal' })
  }

  async verifyCode(phone: PhoneNumber, code: LoginCode): Promise<Result<true, SignInError>> {
    const failure = await this.post('verify', { phone, code })
    if (failure === null) return ok(true)
    if (isTransportError(failure)) return err(failure)
    return err({ code: failure.code === 'loginCodeExpired' ? 'loginCodeExpired' : 'invalidLoginCode' })
  }

  async signOut(): Promise<void> {
    await this.post('signout', {})
  }

  /** `null` = deu certo; senão o erro traduzido do corpo `{ code }`. */
  private async post(step: 'otp' | 'verify' | 'signout', body: unknown): Promise<DomainError | null> {
    try {
      const response = await this.fetcher(`${BFF_AUTH_BASE}/${step}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      return response.ok ? null : parseDomainError(await response.json().catch(() => null))
    } catch {
      return { code: 'network' }
    }
  }
}
