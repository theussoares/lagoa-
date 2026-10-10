import { Module } from '@nestjs/common'
import { DatabaseModule } from '../../database/database.module'
import { DrizzleMerchantShopResolver } from './drizzle-merchant-shop.resolver'
import { MerchantShopGuard } from './merchant-shop.guard'
import { MerchantShopResolver } from './merchant-shop.resolver'

@Module({
  imports: [DatabaseModule],
  providers: [MerchantShopGuard, { provide: MerchantShopResolver, useClass: DrizzleMerchantShopResolver }],
  exports: [MerchantShopGuard, MerchantShopResolver],
})
export class AccessModule {}
