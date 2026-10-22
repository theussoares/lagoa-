import { Module } from '@nestjs/common'
import { DrizzleCustomerHitsRepository } from './drizzle-hits.repository'
import { CustomerHitsController } from './hits.controller'
import { CustomerHitsRepository } from './hits.repository'
import { CustomerHitsService } from './hits.service'

@Module({
  controllers: [CustomerHitsController],
  providers: [CustomerHitsService, { provide: CustomerHitsRepository, useClass: DrizzleCustomerHitsRepository }],
})
export class CustomerHitsModule {}
