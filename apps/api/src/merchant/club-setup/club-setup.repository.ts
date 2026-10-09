import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ProgramUnit } from '#shared/schemas/program'
import type { ShopStatus } from '#shared/schemas/shop'

export interface CreatedClub {
  readonly shopId: string
  readonly shopName: string
  readonly shopStatus: ShopStatus
}

export interface PosterData {
  readonly shopName: string
  readonly status: ShopStatus
  readonly checkInCode: string
  readonly rewardTitle: string
  readonly unit: ProgramUnit
  readonly target: number
}

export abstract class ClubSetupRepository {
  abstract findShopByOwner(ownerUserId: string): Promise<{ id: string; status: ShopStatus } | null>
  abstract createClub(ownerUserId: string, draft: ClubSetupDraft, checkInCode: string): Promise<CreatedClub>
  abstract getPoster(ownerUserId: string): Promise<PosterData | null>
  abstract getStatus(ownerUserId: string): Promise<ShopStatus | null>
  abstract approveShop(ownerUserId: string): Promise<ShopStatus | null>
}
