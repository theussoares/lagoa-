import { Body, Controller, Get, Post } from '@nestjs/common'
import { ClubSetupDraftSchema, type ClubSetupDraft } from '#shared/schemas/onboarding'
import type { MerchantSession } from '#shared/schemas/session'
import type { ShopPoster, ShopStatus } from '#shared/schemas/shop'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ClubSetupService } from './club-setup.service'
import { MerchantSurface } from '../access/merchant-surface.decorator'

@MerchantSurface({ shopRequired: false })
@Controller('merchant')
export class ClubSetupController {
  constructor(private readonly setup: ClubSetupService) {}

  @Post('club-setup')
  async createClub(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ClubSetupDraftSchema)) draft: ClubSetupDraft,
  ): Promise<MerchantSession> {
    return unwrap(await this.setup.createClub(user.id, draft))
  }

  @Get('poster')
  async getPoster(@CurrentUser() user: AuthUser): Promise<ShopPoster> {
    return unwrap(await this.setup.getPoster(user.id))
  }

  @Get('shop/status')
  async getStatus(@CurrentUser() user: AuthUser): Promise<{ status: ShopStatus }> {
    const status = unwrap(await this.setup.getStatus(user.id))
    return { status }
  }

  @Post('shop/test-approve')
  async testApprove(@CurrentUser() user: AuthUser): Promise<{ status: ShopStatus }> {
    const status = unwrap(await this.setup.testApprove(user.id))
    return { status }
  }
}
