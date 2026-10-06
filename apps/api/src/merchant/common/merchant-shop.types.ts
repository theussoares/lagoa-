import type { ShopStatus } from '#shared/schemas/shop'
import type { AuthenticatedRequest } from '../../auth/auth.types'

export interface MerchantShopContext {
  readonly id: string
  readonly ownerUserId: string
  readonly name: string
  readonly status: ShopStatus
}

export type MerchantRequest = AuthenticatedRequest & { shop: MerchantShopContext }
