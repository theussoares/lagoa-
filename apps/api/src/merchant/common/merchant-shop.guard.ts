import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { DomainException } from '../../common/http/domain-exception'
import { SessionRepository } from '../session/session.repository'
import type { MerchantRequest } from './merchant-shop.types'

@Injectable()
export class MerchantShopGuard implements CanActivate {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MerchantRequest>()
    const userId = request.user?.id
    if (!userId) {
      throw new DomainException({ code: 'unauthorized' })
    }

    const shop = await this.sessionRepo.findByOwnerUserId(userId)
    if (!shop) {
      throw new DomainException({ code: 'notFound', entity: 'merchant' })
    }

    request.shop = shop
    return true
  }
}
