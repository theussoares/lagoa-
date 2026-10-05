import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { clientIpOf } from '../common/http/client-ip'
import type { AuthenticatedRequest } from './auth.types'

/**
 * Roda depois do guard de auth: conta por usuário (atrás de proxy o IP é compartilhado) e cai
 * para o IP do cliente (o do BFF, quando ele se identifica) nas rotas públicas.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: Partial<AuthenticatedRequest>): Promise<string> {
    return request.user?.id ?? clientIpOf(request)
  }
}
