import { Body, Controller, Headers, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CheckInRequest, CheckInRequestSchema, type CheckInResult, IdempotencyKeySchema } from '#shared/schemas/visit'
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

  /** Limite curto: o código da loja são 6 caracteres e não pode ser adivinhado por tentativa e erro. */
  @Post()
  @RequiresTerms()
  @Throttle({ default: { limit: 10, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })
  async checkIn(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(CheckInRequestSchema)) body: CheckInRequest,
    @Headers('idempotency-key') rawClientKey?: string,
  ): Promise<CheckInResult> {
    return unwrap(await this.checkIns.checkIn(user.id, body.code, idempotencyKey.transform(rawClientKey)))
  }
}
