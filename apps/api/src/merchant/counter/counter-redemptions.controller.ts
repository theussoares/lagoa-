import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { REDEMPTION_CODE_INPUT_MAX_LENGTH } from '#shared/constants/domain'
import { type RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CounterRedemptionsService } from './counter-redemptions.service'
import { FailClosedThrottle } from '../../throttling/fail-closed-throttle'
import { RequiresMerchantTerms } from '../terms/merchant-terms.guard'
import { MerchantSurface } from '../access/merchant-surface.decorator'

const ValidateRedemptionBodySchema = z.object({
  code: z.string().trim().min(1).max(REDEMPTION_CODE_INPUT_MAX_LENGTH),
})
type ValidateRedemptionBody = z.infer<typeof ValidateRedemptionBodySchema>

const ConfirmRedemptionBodySchema = z.object({
  redemptionId: z.string().uuid(),
})
type ConfirmRedemptionBody = z.infer<typeof ConfirmRedemptionBodySchema>

const RedemptionIdParamSchema = z.string().uuid()

// Decorador de classe roda de baixo para cima: o guard da loja precisa entrar antes do guard do termo.
@RequiresMerchantTerms()
@MerchantSurface()
@Controller('merchant/counter/redemptions')
export class CounterRedemptionsController {
  constructor(private readonly service: CounterRedemptionsService) {}

  /** Adivinhar código é a única forma de abusar daqui: teto por usuário (= por loja, um dono uma loja) e por IP, e recusa se o contador cair. */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @FailClosedThrottle()
  @Throttle({ default: { limit: 20, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })
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
