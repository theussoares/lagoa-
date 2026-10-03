import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { AuthenticatedRequest } from './auth.types'

/**
 * Roda depois do guard de auth: conta por usuário (atrás de proxy o IP é compartilhado) e cai
 * para o IP nas rotas públicas.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(request: Partial<AuthenticatedRequest>): Promise<string> {
    return request.user?.id ?? request.ip ?? 'unknown'
  }
}
