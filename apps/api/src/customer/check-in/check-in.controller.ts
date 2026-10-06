import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { FailClosedThrottle } from '../../throttling/fail-closed-throttle'
import { VISIT_CODE_ATTEMPTS_LIMIT, VISIT_CODE_ATTEMPTS_WINDOW_MINUTES } from '#shared/constants/domain'
import {
  type CheckInResult,
  IdempotencyKeySchema,
  type VisitCodeClaimRequest,
  VisitCodeClaimRequestSchema,
  type VisitQrClaimRequest,
  VisitQrClaimRequestSchema,
} from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { CheckInService } from './check-in.service'
import { RequiresTerms } from '../profile/terms.guard'

const idempotencyKey = new ZodValidationPipe(IdempotencyKeySchema.optional())

@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkIns: CheckInService) {}

  /** Ganha pelo QR da visita (token). O token tem 256 bits: o limite geral basta contra tentativa e erro. */
  @Post()
  @HttpCode(200)
  @RequiresTerms()
  @Throttle({ default: { limit: 10, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })
  async claimByToken(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VisitQrClaimRequestSchema)) body: VisitQrClaimRequest,
    @Headers('idempotency-key') rawClientKey?: string,
  ): Promise<CheckInResult> {
    idempotencyKey.transform(rawClientKey)
    return unwrap(await this.checkIns.claimVisitQr(user.id, body))
  }

  /**
   * Ganha pelo código curto digitado. São 28⁵ combinações e cada acerto tira a visita de quem está no caixa, então
   * o teto por conta é baixo e fica nesta rota própria (P-03).
   */
  @Post('code')
  @HttpCode(200)
  @RequiresTerms()
  @Throttle({
    default: { limit: VISIT_CODE_ATTEMPTS_LIMIT, ttl: VISIT_CODE_ATTEMPTS_WINDOW_MINUTES * 60_000 },
    ip: { limit: 60, ttl: 60_000 },
  })
  async claimByCode(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(VisitCodeClaimRequestSchema)) body: VisitCodeClaimRequest,
    @Headers('idempotency-key') rawClientKey?: string,
  ): Promise<CheckInResult> {
    idempotencyKey.transform(rawClientKey)
    return unwrap(await this.checkIns.claimVisitQr(user.id, body))
  }
}
