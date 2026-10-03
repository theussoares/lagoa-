import { type CanActivate, type ExecutionContext } from '@nestjs/common'
import type { AuthenticatedRequest, AuthUser } from '../auth/auth.types'

export const TEST_USER: AuthUser = { id: '0190a000-0000-7000-8000-000000000001', email: 'ana@example.com' }

/** Troca o JWT por um usuário fixo; a validação do token tem teste próprio (supabase-auth.guard.test.ts). */
export class FakeAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest<AuthenticatedRequest>().user = TEST_USER
    return true
  }
}
