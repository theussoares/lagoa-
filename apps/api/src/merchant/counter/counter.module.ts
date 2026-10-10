import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { LedgerModule } from '../../ledger/ledger.module'
import { CounterController } from './counter.controller'
import { CounterRedemptionsController } from './counter-redemptions.controller'
import { CounterRedemptionsService } from './counter-redemptions.service'
import { CounterRepository } from './counter.repository'
import { CounterService } from './counter.service'
import { DrizzleCounterRepository } from './drizzle-counter.repository'
import { AccessModule } from '../access/access.module'

@Module({
  imports: [AccessModule, DatabaseModule, LedgerModule, CommonModule],
  controllers: [CounterController, CounterRedemptionsController],
  providers: [
    CounterService,
    CounterRedemptionsService,
    { provide: CounterRepository, useClass: DrizzleCounterRepository },
  ],
  exports: [CounterService, CounterRedemptionsService, CounterRepository],
})
export class CounterModule {}
