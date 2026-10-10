import { Injectable } from '@nestjs/common'
import { MERCHANT_TERMS_VERSION } from '#shared/constants/domain'
import { MerchantIdSchema, ShopIdSchema } from '#shared/schemas/ids'
import type { MerchantSession } from '#shared/schemas/session'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { SessionRepository } from './session.repository'

@Injectable()
export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}

  async current(userId: string): Promise<Result<MerchantSession, ErrorOf<'notFound'>>> {
    const shop = await this.sessions.findByOwnerUserId(userId)
    if (shop === null) return err({ code: 'notFound', entity: 'merchant' })
    return ok({
      role: 'merchant',
      merchantId: MerchantIdSchema.parse(userId),
      shopId: ShopIdSchema.parse(shop.id),
      shopName: shop.name,
      shopStatus: shop.status,
      termsAccepted: shop.merchantTermsVersion === MERCHANT_TERMS_VERSION,
    })
  }
}
