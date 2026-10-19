import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import type { AuthenticatedRequest } from '../../auth/auth.types'
import { DomainException } from '../../common/http/domain-exception'
import type { AdminContext } from './admin.context'
import { AdminUsersReader } from './admin-users.reader'

export type AdminRequest = AuthenticatedRequest & { admin?: AdminContext }

/**
 * Roda depois dos guards globais, em toda rota com `@AdminSurface()`: papel `admin` no `app_metadata`, sessão com MFA
 * (`aal2`) e linha ativa em `admin_users`. Toda recusa é o mesmo 403, para não contar qual das checagens faltou.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly admins: AdminUsersReader) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>()
    const { user } = request
    if (user.role !== 'admin' || user.aal !== 'aal2') throw new DomainException({ code: 'forbidden' })
    if (!(await this.admins.isActiveAdmin(user.id))) throw new DomainException({ code: 'forbidden' })
    request.admin = { adminId: user.id }
    return true
  }
}
