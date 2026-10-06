import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { LedgerModule } from '../../ledger/ledger.module'
import { CounterController } from './counter.controller'
import { CounterRepository } from './counter.repository'
import { CounterService } from './counter.service'
import { DrizzleCounterRepository } from './drizzle-counter.repository'

@Module({
  imports: [DatabaseModule, LedgerModule, CommonModule],
  controllers: [CounterController],
  providers: [
    CounterService,
    { provide: CounterRepository, useClass: DrizzleCounterRepository },
  ],
  exports: [CounterService, CounterRepository],
})
export class CounterModule {}
