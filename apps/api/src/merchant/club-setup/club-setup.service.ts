import { Injectable } from '@nestjs/common'
import { MerchantIdSchema, ShopIdSchema } from '#shared/schemas/ids'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession } from '#shared/schemas/session'
import { CheckInCodeSchema, type ShopPoster, type ShopStatus } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ClubSetupRepository } from './club-setup.repository'
import { newCheckInCode } from './club-setup.rules'

export type CreateClubError = ErrorOf<'invalidClubSetup'> | ErrorOf<'unauthorized'>

@Injectable()
export class ClubSetupService {
  constructor(private readonly repo: ClubSetupRepository) {}

  async createClub(ownerUserId: string, draft: ClubSetupDraft): Promise<Result<MerchantSession, CreateClubError>> {
    const existing = await this.repo.findShopByOwner(ownerUserId)
    if (existing !== null) {
      return err({ code: 'invalidClubSetup' })
    }

    const code = newCheckInCode()
    const created = await this.repo.createClub(ownerUserId, draft, code)
    return ok({
      role: 'merchant',
      merchantId: MerchantIdSchema.parse(ownerUserId),
      shopId: ShopIdSchema.parse(created.shopId),
      shopName: created.shopName,
      shopStatus: created.shopStatus,
    })
  }

  async getPoster(ownerUserId: string): Promise<Result<ShopPoster, ErrorOf<'notFound'>>> {
    const data = await this.repo.getPoster(ownerUserId)
    if (data === null) return err({ code: 'notFound', entity: 'program' })
    return ok({
      shopName: data.shopName,
      status: data.status,
      checkInCode: CheckInCodeSchema.parse(data.checkInCode),
      rewardTitle: data.rewardTitle,
      unit: data.unit,
      target: data.target,
    })
  }

  async getStatus(ownerUserId: string): Promise<Result<ShopStatus, ErrorOf<'notFound'>>> {
    const status = await this.repo.getStatus(ownerUserId)
    if (status === null) return err({ code: 'notFound', entity: 'merchant' })
    return ok(status)
  }

  async testApprove(ownerUserId: string): Promise<Result<ShopStatus, ErrorOf<'notFound' | 'unauthorized'>>> {
    if (process.env.ENABLE_TEST_APPROVE !== '1') {
      return err({ code: 'unauthorized' })
    }
    const status = await this.repo.approveShop(ownerUserId)
    if (status === null) return err({ code: 'notFound', entity: 'merchant' })
    return ok(status)
  }
}
