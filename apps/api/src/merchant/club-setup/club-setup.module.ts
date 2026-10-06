import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { ClubSetupController } from './club-setup.controller'
import { ClubSetupRepository } from './club-setup.repository'
import { ClubSetupService } from './club-setup.service'
import { DrizzleClubSetupRepository } from './drizzle-club-setup.repository'

@Module({
  imports: [DatabaseModule],
  controllers: [ClubSetupController],
  providers: [
    ClubSetupService,
    { provide: ClubSetupRepository, useClass: DrizzleClubSetupRepository },
  ],
  exports: [ClubSetupService, ClubSetupRepository],
})
export class ClubSetupModule {}
