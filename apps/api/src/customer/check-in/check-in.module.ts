import { Module } from '@nestjs/common'
import { LedgerModule } from '../../ledger/ledger.module'
import { ProfileModule } from '../profile/profile.module'
import { CheckInController } from './check-in.controller'
import { CheckInRepository } from './check-in.repository'
import { CheckInService } from './check-in.service'
import { DrizzleCheckInRepository } from './drizzle-check-in.repository'

@Module({
  imports: [LedgerModule, ProfileModule],
  controllers: [CheckInController],
  providers: [CheckInService, { provide: CheckInRepository, useClass: DrizzleCheckInRepository }],
})
export class CheckInModule {}
