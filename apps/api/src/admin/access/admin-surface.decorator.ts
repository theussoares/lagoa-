import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common'
import { AdminGuard } from './admin.guard'

export const ADMIN_SURFACE = 'adminSurface'

/**
 * Obrigatório em todo controller do painel da rede: liga o `AdminGuard` e é a única marca que deixa um token de admin
 * passar pelo `SurfaceRoleGuard`. Um teste varre o `AdminModule` e falha se faltar.
 */
export const AdminSurface = (): ClassDecorator => applyDecorators(UseGuards(AdminGuard), SetMetadata(ADMIN_SURFACE, true))
