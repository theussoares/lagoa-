import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { ADMIN_SURFACE, isAdminPath } from '../admin/access/admin-surface.decorator'
import { DomainException } from '../common/http/domain-exception'
import type { AuthenticatedRequest } from './auth.types'
import { IS_PUBLIC } from './public.decorator'

/** Mesma recusa para qualquer motivo: não conta se faltou papel, marca ou guard. */
const forbidden = (): DomainException => new DomainException({ code: 'forbidden' })

/**
 * Global, depois do JWT e do limite: token de admin da rede só abre rota com `@AdminSurface()`. Sem isso, uma conta de
 * admin (que também é um usuário do Supabase) chegaria à carteira ou ao painel do lojista como se fosse cliente.
 * E controller sob `admin/` sem `@AdminSurface()` (sem o AdminGuard) é recusado a todos, até em rota pública.
 */
@Injectable()
export class SurfaceRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const controller = context.getClass()
    // `@AdminSurface()` é decorator de classe: só a classe conta.
    const adminSurface = this.reflector.get<boolean | undefined>(ADMIN_SURFACE, controller) === true
    if (!adminSurface && isAdminPath(this.reflector.get<unknown>(PATH_METADATA, controller))) throw forbidden()
    if (this.isPublic(context)) return true
    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>()
    if (user.role === 'admin' && !adminSurface) throw forbidden()
    return true
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC, [context.getHandler(), context.getClass()]) === true
  }
}
