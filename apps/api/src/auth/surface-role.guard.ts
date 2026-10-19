import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ADMIN_SURFACE } from '../admin/access/admin-surface.decorator'
import { DomainException } from '../common/http/domain-exception'
import type { AuthenticatedRequest } from './auth.types'
import { IS_PUBLIC } from './public.decorator'

/**
 * Global, depois do JWT e do limite: token de admin da rede só abre rota com `@AdminSurface()`. Sem isso, uma conta de
 * admin (que também é um usuário do Supabase) chegaria à carteira ou ao painel do lojista como se fosse cliente.
 */
@Injectable()
export class SurfaceRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.marked(context, IS_PUBLIC)) return true
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (user.role === 'admin' && !this.marked(context, ADMIN_SURFACE)) throw new DomainException({ code: 'forbidden' })
    return true
  }

  private marked(context: ExecutionContext, key: string): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(key, [context.getHandler(), context.getClass()]) === true
  }
}
