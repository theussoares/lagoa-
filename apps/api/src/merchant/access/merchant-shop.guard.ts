import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthenticatedRequest } from '../../auth/auth.types'
import { DomainException } from '../../common/http/domain-exception'
import type { MerchantShopContext } from './merchant-shop.context'
import { MerchantShopResolver } from './merchant-shop.resolver'
import { MERCHANT_SURFACE, type MerchantSurfaceOptions } from './merchant-surface.decorator'

export type MerchantRequest = AuthenticatedRequest & { merchantShop?: MerchantShopContext }

/**
 * Roda depois dos guards globais (JWT e limite por usuário): descobre a loja do dono e a põe em
 * `request.merchantShop`. É o único caminho até um `shopId`; nenhuma rota recebe esse id.
 */
@Injectable()
export class MerchantShopGuard implements CanActivate {
  constructor(
    private readonly resolver: MerchantShopResolver,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<Required<MerchantSurfaceOptions> | undefined>(MERCHANT_SURFACE, [
      context.getHandler(),
      context.getClass(),
    ])
    const request = context.switchToHttp().getRequest<MerchantRequest>()
    const shop = await this.resolver.resolveForUser(request.user.id)
    if (shop) request.merchantShop = shop
    else if (options?.shopRequired !== false) throw new DomainException({ code: 'notFound', entity: 'shop' })
    return true
  }
}
