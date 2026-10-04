import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type ReferralCapture, ReferralCaptureSchema, type ReferralInvite } from '#shared/schemas/referral'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { ReferralService } from './referral.service'
import { RequiresTerms } from '../profile/terms.guard'

@Controller('referrals')
export class ReferralController {
  constructor(private readonly referrals: ReferralService) {}

  /** O código que o cliente coloca no link de convite (`/convite?ref=<código>&loja=<código da loja>`). */
  @Get('me')
  async invite(@CurrentUser() user: AuthUser): Promise<ReferralInvite> {
    return unwrap(await this.referrals.invite(user.id))
  }

  /** 204 para qualquer convite, valendo ou não: a resposta não pode servir de oráculo de contas ou lojas. */
  @Post()
  @RequiresTerms()
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })
  async capture(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ReferralCaptureSchema)) body: ReferralCapture,
  ): Promise<void> {
    unwrap(await this.referrals.capture(user.id, body.referralCode, body.shopCode))
  }
}
