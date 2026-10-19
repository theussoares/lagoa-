import { Module } from '@nestjs/common'
import { AccessModule } from '../access/access.module'
import { ShopPhotoModule } from '../shop-photo/shop-photo.module'
import { DrizzleHitsRepository } from './drizzle-hits.repository'
import { HitsController } from './hits.controller'
import { HitsRepository } from './hits.repository'
import { HitsService } from './hits.service'

@Module({
  imports: [AccessModule, ShopPhotoModule],
  controllers: [HitsController],
  providers: [HitsService, { provide: HitsRepository, useClass: DrizzleHitsRepository }],
})
export class HitsModule {}
