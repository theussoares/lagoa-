import { Module } from '@nestjs/common'
import { AdminAccessModule } from '../access/admin-access.module'
import { AdminAuth } from './admin-auth'
import { DrizzleAdminTeamRepository } from './drizzle-team.repository'
import { SupabaseAdminAuth } from './supabase-admin-auth'
import { AdminTeamController } from './team.controller'
import { AdminTeamRepository } from './team.repository'
import { AdminTeamService } from './team.service'

@Module({
  imports: [AdminAccessModule],
  controllers: [AdminTeamController],
  providers: [
    AdminTeamService,
    { provide: AdminTeamRepository, useClass: DrizzleAdminTeamRepository },
    { provide: AdminAuth, useClass: SupabaseAdminAuth },
  ],
})
export class AdminTeamModule {}
