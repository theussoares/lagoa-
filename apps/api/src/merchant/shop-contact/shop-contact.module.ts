import { Module } from '@nestjs/common'
import { AccessModule } from '../access/access.module'
import { DrizzleShopContactRepository } from './drizzle-shop-contact.repository'
import { ShopContactController } from './shop-contact.controller'
import { ShopContactRepository } from './shop-contact.repository'
import { ShopContactService } from './shop-contact.service'

@Module({
  imports: [AccessModule],
  controllers: [ShopContactController],
  providers: [ShopContactService, { provide: ShopContactRepository, useClass: DrizzleShopContactRepository }],
})
export class ShopContactModule {}
