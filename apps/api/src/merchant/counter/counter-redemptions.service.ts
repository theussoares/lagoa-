import { Injectable } from '@nestjs/common'
import { Clock } from '../../common/clock'
import { LoyaltyCardIdSchema, RedemptionIdSchema, ShopIdSchema } from '#shared/schemas/ids'
import { MaskedPhoneSchema } from '#shared/schemas/phone'
import type { RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { toIso } from '#shared/utils/time'
import { CounterRepository, type SettleRedemptionError } from './counter.repository'
import { assertOperationalShop, type ShopClosedError } from './counter.rules'

export type ValidateRedemptionServiceError =
  | ShopClosedError
  | ErrorOf<'notFound' | 'redemptionInvalid' | 'redemptionExpired'>

export type ConfirmRedemptionServiceError =
  | ShopClosedError
  | SettleRedemptionError
  | ErrorOf<'notFound'>

@Injectable()
export class CounterRedemptionsService {
  constructor(
    private readonly repo: CounterRepository,
    private readonly clock: Clock,
  ) {}

  async validateRedemption(
    ownerUserId: string,
    rawCode: string,
  ): Promise<Result<RedemptionPreview, ValidateRedemptionServiceError>> {
    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const shopOperational = assertOperationalShop(shop.shopStatus)
    if (!shopOperational.ok) return shopOperational

    const result = await this.repo.findActiveRedemption(shop.shopId, rawCode, this.clock.now())
    if (!result.ok) return result

    return ok({
      redemptionId: RedemptionIdSchema.parse(result.value.redemptionId),
      rewardTitle: result.value.rewardTitle,
      maskedPhone: MaskedPhoneSchema.parse(result.value.maskedPhone),
      expiresAt: toIso(result.value.expiresAt),
    })
  }

  async confirmRedemption(
    ownerUserId: string,
    redemptionId: string,
  ): Promise<Result<CounterEntry, ConfirmRedemptionServiceError>> {
    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const shopOperational = assertOperationalShop(shop.shopStatus)
    if (!shopOperational.ok) return shopOperational

    return this.repo.settleRedemption(shop, redemptionId, ownerUserId, this.clock.now())
  }
}
