import { Module } from '@nestjs/common'
import { AdminAccessModule } from '../access/admin-access.module'
import { DrizzleAdminFeaturedRepository } from './drizzle-featured.repository'
import { AdminFeaturedController } from './featured.controller'
import { AdminFeaturedRepository } from './featured.repository'
import { AdminFeaturedService } from './featured.service'

@Module({
  imports: [AdminAccessModule],
  controllers: [AdminFeaturedController],
  providers: [AdminFeaturedService, { provide: AdminFeaturedRepository, useClass: DrizzleAdminFeaturedRepository }],
})
export class AdminFeaturedModule {}
