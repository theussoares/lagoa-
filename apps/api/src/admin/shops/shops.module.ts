import { Module } from '@nestjs/common'
import { AdminAccessModule } from '../access/admin-access.module'
import { DrizzleAdminShopsRepository } from './drizzle-shops.repository'
import { AdminShopsController } from './shops.controller'
import { AdminShopsRepository } from './shops.repository'
import { AdminShopsService } from './shops.service'

@Module({
  imports: [AdminAccessModule],
  controllers: [AdminShopsController],
  providers: [AdminShopsService, { provide: AdminShopsRepository, useClass: DrizzleAdminShopsRepository }],
})
export class AdminShopsModule {}
