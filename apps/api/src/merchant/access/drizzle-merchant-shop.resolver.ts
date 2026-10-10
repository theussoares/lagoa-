import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import type { MerchantShopContext } from './merchant-shop.context'
import { MerchantShopResolver } from './merchant-shop.resolver'

@Injectable()
export class DrizzleMerchantShopResolver extends MerchantShopResolver {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  /** Uma consulta pelo índice único `shops_owner_uq`. */
  async resolveForUser(userId: string): Promise<MerchantShopContext | null> {
    const [shop] = await this.db
      .select({ id: shops.id, status: shops.status, plan: shops.plan, termsVersion: shops.merchantTermsVersion })
      .from(shops)
      .where(eq(shops.ownerUserId, userId))
      .limit(1)
    if (!shop) return null
    return { shopId: shop.id, status: shop.status, plan: shop.plan, role: 'owner', termsVersion: shop.termsVersion }
  }
}
