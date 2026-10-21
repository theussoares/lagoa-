import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { AdminContext } from './admin.context'
import type { AdminRequest } from './admin.guard'

/** O admin conferido pelo guard. Falha fechado: sem o guard (controller sem `@AdminSurface()`) lança em vez de seguir sem admin. */
export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): AdminContext => {
  const admin = context.switchToHttp().getRequest<AdminRequest>().admin
  if (!admin) throw new Error('CurrentAdmin used without AdminGuard (missing @AdminSurface)')
  return admin
})
