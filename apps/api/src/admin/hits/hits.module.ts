import { Module } from '@nestjs/common'
import { AdminAccessModule } from '../access/admin-access.module'
import { DrizzleAdminHitsRepository } from './drizzle-hits.repository'
import { AdminHitsController } from './hits.controller'
import { AdminHitsRepository } from './hits.repository'
import { AdminHitsService } from './hits.service'

@Module({
  imports: [AdminAccessModule],
  controllers: [AdminHitsController],
  providers: [AdminHitsService, { provide: AdminHitsRepository, useClass: DrizzleAdminHitsRepository }],
})
export class AdminHitsModule {}
