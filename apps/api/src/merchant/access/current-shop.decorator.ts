import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { MerchantShopContext } from './merchant-shop.context'
import type { MerchantRequest } from './merchant-shop.guard'

/** A loja resolvida pelo guard. Falha fechado: sem o guard (controller sem `@MerchantSurface()`) lança em vez de seguir sem loja. */
export const CurrentShop = createParamDecorator((_data: unknown, context: ExecutionContext): MerchantShopContext => {
  const shop = context.switchToHttp().getRequest<MerchantRequest>().merchantShop
  if (!shop) throw new Error('CurrentShop used without MerchantShopGuard (missing @MerchantSurface or shopRequired: false)')
  return shop
})
