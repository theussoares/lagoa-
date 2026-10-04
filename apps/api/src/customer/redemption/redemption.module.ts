import { Module } from '@nestjs/common'
import { LedgerModule } from '../../ledger/ledger.module'
import { DrizzleRedemptionRepository } from './drizzle-redemption.repository'
import { RedemptionController } from './redemption.controller'
import { RedemptionRepository } from './redemption.repository'
import { RedemptionService } from './redemption.service'

@Module({
  imports: [LedgerModule],
  controllers: [RedemptionController],
  providers: [RedemptionService, { provide: RedemptionRepository, useClass: DrizzleRedemptionRepository }],
})
export class RedemptionModule {}
