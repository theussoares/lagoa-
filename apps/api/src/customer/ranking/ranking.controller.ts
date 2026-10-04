import { Body, Controller, Get, Put } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type Ranking, type RankingConsentUpdate, RankingConsentUpdateSchema } from '#shared/schemas/ranking'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { RankingService } from './ranking.service'

@Controller('customer/ranking')
export class RankingController {
  constructor(private readonly rankings: RankingService) {}

  @Get()
  @Throttle({ default: { limit: 30, ttl: 60_000 }, ip: { limit: 300, ttl: 60_000 } })
  async get(@CurrentUser() user: AuthUser): Promise<Ranking> {
    return unwrap(await this.rankings.get(user.id))
  }

  /** Entrada voluntária e revogável: o apelido só existe enquanto a pessoa está no ranking. */
  @Put('consent')
  async setConsent(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RankingConsentUpdateSchema)) body: RankingConsentUpdate,
  ): Promise<Ranking> {
    return unwrap(await this.rankings.setConsent(user.id, body))
  }
}
