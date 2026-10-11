import { Module } from '@nestjs/common'
import { AccessModule } from '../access/access.module'
import { DrizzleShopPhotoRepository } from './drizzle-shop-photo.repository'
import { ShopPhotoController } from './shop-photo.controller'
import { ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoService } from './shop-photo.service'
import { ShopPhotoStorage } from './shop-photo.storage'
import { SupabaseShopPhotoStorage } from './supabase-shop-photo.storage'

@Module({
  imports: [AccessModule],
  controllers: [ShopPhotoController],
  providers: [
    ShopPhotoService,
    { provide: ShopPhotoRepository, useClass: DrizzleShopPhotoRepository },
    { provide: ShopPhotoStorage, useClass: SupabaseShopPhotoStorage },
  ],
})
export class ShopPhotoModule {}
