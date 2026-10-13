import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common'
import { type ShopContact, type ShopContactUpdate, ShopContactUpdateSchema } from '#shared/schemas/shop'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CurrentShop } from '../access/current-shop.decorator'
import type { MerchantShopContext } from '../access/merchant-shop.context'
import { MerchantSurface } from '../access/merchant-surface.decorator'
import { ShopContactService } from './shop-contact.service'

@MerchantSurface()
@Controller('merchant/shop/contact')
export class ShopContactController {
  constructor(private readonly contact: ShopContactService) {}

  @Get()
  async current(@CurrentShop() shop: MerchantShopContext): Promise<ShopContact> {
    return unwrap(await this.contact.current(shop.shopId))
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async replace(
    @CurrentShop() shop: MerchantShopContext,
    @Body(new ZodValidationPipe(ShopContactUpdateSchema)) body: ShopContactUpdate,
  ): Promise<ShopContact> {
    return unwrap(await this.contact.replace(shop.shopId, body))
  }
}
