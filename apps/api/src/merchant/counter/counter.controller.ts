import { Body, Controller, Get, Post } from '@nestjs/common'
import type { CounterEntry, VisitRegistered } from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe'
import {
  type RegisterAmountBody,
  RegisterAmountBodySchema,
  type RegisterVisitBody,
  RegisterVisitBodySchema,
} from './counter.dto'
import { CounterService } from './counter.service'

@Controller('merchant/counter')
export class CounterController {
  constructor(private readonly counter: CounterService) {}

  @Post('visits')
  async registerVisit(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RegisterVisitBodySchema)) body: RegisterVisitBody,
  ): Promise<VisitRegistered> {
    return unwrap(await this.counter.registerVisit(user.id, body.phone, { kind: 'visit' }))
  }

  @Post('amount')
  async registerAmount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(RegisterAmountBodySchema)) body: RegisterAmountBody,
  ): Promise<VisitRegistered> {
    return unwrap(
      await this.counter.registerVisit(user.id, body.phone, {
        kind: 'amount',
        amountCents: body.amountCents,
      }),
    )
  }

  @Get('entries/today')
  async listTodayEntries(@CurrentUser() user: AuthUser): Promise<CounterEntry[]> {
    return unwrap(await this.counter.listTodayEntries(user.id))
  }
}
