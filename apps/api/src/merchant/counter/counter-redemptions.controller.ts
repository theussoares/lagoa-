import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { type RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CounterRedemptionsService } from './counter-redemptions.service'
import { MerchantSurface } from '../access/merchant-surface.decorator'

const ValidateRedemptionBodySchema = z.object({
  code: z.string().trim().min(1),
})
type ValidateRedemptionBody = z.infer<typeof ValidateRedemptionBodySchema>

const ConfirmRedemptionBodySchema = z.object({
  redemptionId: z.string().uuid(),
})
type ConfirmRedemptionBody = z.infer<typeof ConfirmRedemptionBodySchema>

const RedemptionIdParamSchema = z.string().uuid()

@MerchantSurface()
@Controller('merchant/counter/redemptions')
export class CounterRedemptionsController {
  constructor(private readonly service: CounterRedemptionsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ValidateRedemptionBodySchema)) body: ValidateRedemptionBody,
  ): Promise<RedemptionPreview> {
    return unwrap(await this.service.validateRedemption(user.id, body.code))
  }

  @Post('confirm')
  async confirmBody(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(ConfirmRedemptionBodySchema)) body: ConfirmRedemptionBody,
  ): Promise<CounterEntry> {
    return unwrap(await this.service.confirmRedemption(user.id, body.redemptionId))
  }

  @Post(':id/confirm')
  async confirmParam(
    @CurrentUser() user: AuthUser,
    @Param('id', new ZodValidationPipe(RedemptionIdParamSchema)) redemptionId: string,
  ): Promise<CounterEntry> {
    return unwrap(await this.service.confirmRedemption(user.id, redemptionId))
  }
}
