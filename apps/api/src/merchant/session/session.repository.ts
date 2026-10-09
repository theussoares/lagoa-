import type { ShopStatus } from '#shared/schemas/shop'

export interface MerchantShopRecord {
  readonly id: string
  readonly ownerUserId: string
  readonly name: string
  readonly status: ShopStatus
}

export abstract class SessionRepository {
  abstract findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null>
}
