import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { AccessModule } from '../access/access.module'
import { DrizzleMerchantTermsRepository } from './drizzle-terms.repository'
import { MerchantTermsGuard } from './merchant-terms.guard'
import { MerchantTermsController } from './terms.controller'
import { MerchantTermsRepository } from './terms.repository'

@Module({
  imports: [AccessModule, DatabaseModule],
  controllers: [MerchantTermsController],
  providers: [MerchantTermsGuard, { provide: MerchantTermsRepository, useClass: DrizzleMerchantTermsRepository }],
  exports: [MerchantTermsGuard],
})
export class MerchantTermsModule {}
