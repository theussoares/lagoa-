import { Module } from '@nestjs/common'
import { DrizzleRedemptionRepository } from './drizzle-redemption.repository'
import { RedemptionController } from './redemption.controller'
import { RedemptionRepository } from './redemption.repository'
import { RedemptionService } from './redemption.service'

@Module({
  controllers: [RedemptionController],
  providers: [RedemptionService, { provide: RedemptionRepository, useClass: DrizzleRedemptionRepository }],
})
export class RedemptionModule {}
