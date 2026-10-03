import { Module } from '@nestjs/common'
import { LedgerModule } from '../../ledger/ledger.module'
import { CheckInController } from './check-in.controller'
import { CheckInRepository } from './check-in.repository'
import { CheckInService } from './check-in.service'
import { DrizzleCheckInRepository } from './drizzle-check-in.repository'

@Module({
  imports: [LedgerModule],
  controllers: [CheckInController],
  providers: [CheckInService, { provide: CheckInRepository, useClass: DrizzleCheckInRepository }],
})
export class CheckInModule {}
