import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type ShopPhoto, type ShopPhotoUpload, ShopPhotoUploadSchema } from '#shared/schemas/shop'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CurrentShop } from '../access/current-shop.decorator'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { ShopPhotoService } from './shop-photo.service'

/** Foto da loja: vale também aguardando aprovação, para a vitrine já nascer pronta. */
@MerchantSurface()
@Controller('merchant/shop/photo')
export class ShopPhotoController {
  constructor(private readonly photos: ShopPhotoService) {}

  @Get()
  async current(@CurrentShop() shop: MerchantShopContext): Promise<ShopPhoto> {
    return this.photos.current(shop.shopId)
  }

  /** 20 trocas por hora: cada uma grava um arquivo no bucket. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  async replace(
    @CurrentShop() shop: MerchantShopContext,
    @Body(new ZodValidationPipe(ShopPhotoUploadSchema)) upload: ShopPhotoUpload,
  ): Promise<ShopPhoto> {
    return unwrap(await this.photos.replace(shop.shopId, upload))
  }
}
