import { Controller, Get, Param, Query } from '@nestjs/common'
import { z } from 'zod'
import { WALLET_ACTIVITY_DEFAULT_LIMIT, WALLET_ACTIVITY_MAX_LIMIT } from '#shared/constants/domain'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { WalletActivity } from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { WalletService } from './wallet.service'

const ShopIdParam = new ZodValidationPipe(z.uuid())
const LimitQuery = new ZodValidationPipe(
  z.coerce.number().int().min(1).max(WALLET_ACTIVITY_MAX_LIMIT).default(WALLET_ACTIVITY_DEFAULT_LIMIT),
)

@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('cards')
  async listCards(@CurrentUser() user: AuthUser): Promise<WalletCard[]> {
    return unwrap(await this.wallet.listCards(user.id))
  }

  @Get('cards/:shopId')
  async getCard(@CurrentUser() user: AuthUser, @Param('shopId', ShopIdParam) shopId: string): Promise<WalletCard> {
    return unwrap(await this.wallet.getCard(user.id, shopId))
  }

  @Get('activity')
  async listActivity(@CurrentUser() user: AuthUser, @Query('limit', LimitQuery) limit: number): Promise<WalletActivity[]> {
    return unwrap(await this.wallet.listActivity(user.id, limit))
  }

  @Get('rewards')
  async listRewardHistory(@CurrentUser() user: AuthUser, @Query('limit', LimitQuery) limit: number): Promise<WalletActivity[]> {
    return unwrap(await this.wallet.listRewardHistory(user.id, limit))
  }
}
