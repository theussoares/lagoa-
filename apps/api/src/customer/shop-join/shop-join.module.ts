import { Module } from '@nestjs/common'
import { LedgerModule } from '../../ledger/ledger.module'
import { ProfileModule } from '../profile/profile.module'
import { DrizzleShopJoinRepository } from './drizzle-shop-join.repository'
import { ShopJoinController } from './shop-join.controller'
import { ShopJoinRepository } from './shop-join.repository'
import { ShopJoinService } from './shop-join.service'

@Module({
  imports: [LedgerModule, ProfileModule],
  controllers: [ShopJoinController],
  providers: [ShopJoinService, { provide: ShopJoinRepository, useClass: DrizzleShopJoinRepository }],
})
export class ShopJoinModule {}
