import type { PhoneNumber } from '#shared/schemas/phone'
import type { LoginCode } from '#shared/schemas/session'
import type { LoginChallenge, MerchantSignInResult } from '#shared/schemas/session'
import type { TransportError } from '#shared/types/errors'
import { ok } from '#shared/types/result'
import type { Result } from '#shared/types/result'
import { requestLoginCode, signInMerchant } from '../mock/handlers/auth'
import type { MockBackend } from '../mock/MockBackend'
import type { MerchantAuthService, MerchantSignInError } from './AuthService'

export class MockAuthService implements MerchantAuthService {
  constructor(private readonly backend: MockBackend) {}

  requestLoginCode(phone: PhoneNumber): Promise<Result<LoginChallenge, TransportError>> {
    return this.backend.run((ctx) => ok(requestLoginCode(ctx, phone, this.backend.loginCode)))
  }

  signInMerchant(phone: PhoneNumber, code: LoginCode): Promise<Result<MerchantSignInResult, MerchantSignInError>> {
    return this.backend.run((ctx) => signInMerchant(ctx, phone, code))
  }

  async signOut(): Promise<void> {}
}
