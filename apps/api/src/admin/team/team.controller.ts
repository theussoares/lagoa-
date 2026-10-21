import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { type AdminInvite, AdminInviteSchema, type AdminUser } from '#shared/schemas/admin'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import type { AdminContext } from '../access/admin.context'
import { AdminSurface } from '../access/admin-surface.decorator'
import { CurrentAdmin } from '../access/current-admin.decorator'
import { AdminTeamService } from './team.service'

const AdminIdParam = new ZodValidationPipe(z.uuid())

/** Equipe da rede. Ninguém age sobre si mesmo (`forbidden`); cada ação fica em `admin_events`. */
@AdminSurface()
@Controller('admin/team')
export class AdminTeamController {
  constructor(private readonly team: AdminTeamService) {}

  @Get()
  async list(): Promise<AdminUser[]> {
    return this.team.list()
  }

  @Post('invite')
  async invite(@CurrentAdmin() admin: AdminContext, @Body(new ZodValidationPipe(AdminInviteSchema)) invite: AdminInvite): Promise<AdminUser> {
    return unwrap(await this.team.invite(admin, invite))
  }

  @Post(':id/disable')
  @HttpCode(HttpStatus.OK)
  async disable(@CurrentAdmin() admin: AdminContext, @Param('id', AdminIdParam) id: string): Promise<AdminUser> {
    return unwrap(await this.team.disable(admin, id))
  }

  @Post(':id/reactivate')
  @HttpCode(HttpStatus.OK)
  async reactivate(@CurrentAdmin() admin: AdminContext, @Param('id', AdminIdParam) id: string): Promise<AdminUser> {
    return unwrap(await this.team.reactivate(admin, id))
  }

  @Post(':id/reset-mfa')
  @HttpCode(HttpStatus.OK)
  async resetMfa(@CurrentAdmin() admin: AdminContext, @Param('id', AdminIdParam) id: string): Promise<AdminUser> {
    return unwrap(await this.team.resetMfa(admin, id))
  }
}
