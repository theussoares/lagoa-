import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { type Redemption, type RedemptionRequest, RedemptionRequestSchema } from '#shared/schemas/redemption'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { RedemptionService } from './redemption.service'

const RedemptionIdParam = new ZodValidationPipe(z.uuid())

@Controller('redemptions')
export class RedemptionController {
  constructor(private readonly redemptions: RedemptionService) {}

  /** "Gera ou devolve": repetir o pedido com o código ainda válido devolve o mesmo, então é 200. */
  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 }, ip: { limit: 100, ttl: 60_000 } })
  async request(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RedemptionRequestSchema)) body: RedemptionRequest,
  ): Promise<Redemption> {
    return unwrap(await this.redemptions.requestCode(user.id, body.cardId))
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', RedemptionIdParam) id: string): Promise<Redemption> {
    return unwrap(await this.redemptions.get(user.id, id))
  }
}
