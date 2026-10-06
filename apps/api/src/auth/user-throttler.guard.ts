import { ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'
import type { ThrottlerRequest } from '@nestjs/throttler'
import { clientIpOf } from '../common/http/client-ip'
import { FAIL_CLOSED_THROTTLE } from '../throttling/fail-closed-throttle'
import { RateLimitStorageUnavailableError } from '../throttling/postgres-throttler.storage'
import type { AuthenticatedRequest } from './auth.types'

/**
 * Roda depois do guard de auth: conta por usuário (atrás de proxy o IP é compartilhado) e cai
 * para o IP do cliente (o do BFF, quando ele se identifica) nas rotas públicas.
 *
 * Se o contador compartilhado cair: rota com `@FailClosedThrottle()` recusa (429); as demais deixam passar, porque o
 * limite é só proteção de volume e derrubar o app inteiro junto com o banco não protege nada.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private readonly failureLogger = new Logger('Throttler')

  protected override async getTracker(request: Partial<AuthenticatedRequest>): Promise<string> {
    return request.user?.id ?? clientIpOf(request)
  }

  protected override async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    try {
      return await super.handleRequest(props)
    } catch (error) {
      if (!(error instanceof RateLimitStorageUnavailableError)) throw error
      if (this.failsClosed(props.context)) throw new ThrottlerException()
      this.failureLogger.warn('Counter unavailable, letting the request through')
      return true
    }
  }

  private failsClosed(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(FAIL_CLOSED_THROTTLE, [context.getHandler(), context.getClass()]) === true
  }
}
