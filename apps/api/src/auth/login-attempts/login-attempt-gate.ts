import { Inject, Injectable, Logger } from '@nestjs/common'
import type { ThrottlerStorage } from '@nestjs/throttler'
import { LOGIN_VERIFY_ATTEMPTS_MAX, LOGIN_VERIFY_WINDOW_MINUTES } from '#shared/constants/domain'
import type { PhoneNumber } from '#shared/schemas/phone'
import { PiiService } from '../../common/pii.service'

/** Contador compartilhado (o mesmo `rate_limits` do limite de uso, ADR-0002). */
export const LOGIN_ATTEMPT_COUNTER = Symbol('LOGIN_ATTEMPT_COUNTER')

const WINDOW_MS = LOGIN_VERIFY_WINDOW_MINUTES * 60_000

/** A chave leva o hash do celular (HMAC com pepper), nunca o número. */
export const loginAttemptKey = (phoneHash: Buffer): string => `login-verify:${phoneHash.toString('hex')}`

/** Decide se este celular ainda pode tentar um código de login agora. Cada pergunta já conta uma tentativa. */
@Injectable()
export class LoginAttemptGate {
  private readonly logger = new Logger('LoginAttempts')

  constructor(
    @Inject(LOGIN_ATTEMPT_COUNTER) private readonly counter: ThrottlerStorage,
    private readonly pii: PiiService,
  ) {}

  async allow(phone: PhoneNumber): Promise<boolean> {
    try {
      const record = await this.counter.increment(loginAttemptKey(this.pii.hashPhone(phone)), WINDOW_MS, LOGIN_VERIFY_ATTEMPTS_MAX, 0, 'loginVerify')
      return !record.isBlocked
    } catch {
      // Sem contador não há teto, e o teto é o que segura a adivinhação do código: recusa (fail-closed).
      this.logger.warn('Counter unavailable, refusing the login attempt')
      return false
    }
  }
}
