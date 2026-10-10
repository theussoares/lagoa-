import type { ShopStatus } from '#shared/schemas/shop'

export interface MerchantShopRecord {
  readonly id: string
  readonly ownerUserId: string
  readonly name: string
  readonly status: ShopStatus
  readonly merchantTermsVersion: string | null
}

export abstract class SessionRepository {
  abstract findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null>
}
