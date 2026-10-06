import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type ShopJoinRequest, ShopJoinRequestSchema, type ShopJoinResult } from '#shared/schemas/shop'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import { RequiresTerms } from '../profile/terms.guard'
import { ShopJoinService } from './shop-join.service'

@Controller('shop-join')
export class ShopJoinController {
  constructor(private readonly shopJoin: ShopJoinService) {}

  /** Mesmo limite do check-in: o código da loja é curto e não pode ser adivinhado por tentativa e erro. */
  @Post()
  @HttpCode(200)
  @RequiresTerms()
  @Throttle({ default: { limit: 10, ttl: 60_000 }, ip: { limit: 60, ttl: 60_000 } })
  async join(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(ShopJoinRequestSchema)) body: ShopJoinRequest): Promise<ShopJoinResult> {
    return unwrap(await this.shopJoin.joinShop(user.id, body.code))
  }
}
