import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { MerchantRequest, MerchantShopContext } from './merchant-shop.types'

export const CurrentShop = createParamDecorator(
  (_data: unknown, context: ExecutionContext): MerchantShopContext =>
    context.switchToHttp().getRequest<MerchantRequest>().shop,
)
