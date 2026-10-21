import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

export const ADMIN_SURFACE = 'adminSurface'

/** Primeiro segmento do caminho do controller (`'/admin/shops'`, `['admin']`...) é `admin`: rota do painel da rede. */
export function isAdminPath(path: unknown): boolean {
  const paths = Array.isArray(path) ? path : [path]
  return paths.some((entry) => typeof entry === 'string' && entry.replace(/^\/+/, '').split('/')[0] === 'admin')
}

/**
 * Obrigatório em todo controller do painel da rede: liga o `AdminGuard` e é a única marca que deixa um token de admin
 * passar pelo `SurfaceRoleGuard`. Controller sob `admin/` sem ela é recusado a todos pelo guard global, e um teste
 * varre os controllers e falha se faltar.
 */
export const AdminSurface = (): ClassDecorator => applyDecorators(UseGuards(AdminGuard), SetMetadata(ADMIN_SURFACE, true))
