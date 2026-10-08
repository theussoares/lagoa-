import { Controller, Get } from '@nestjs/common'
import type { CounterEntry } from '#shared/schemas/visit'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { CounterService } from './counter.service'

@Controller('merchant/counter')
export class CounterController {
  constructor(private readonly counter: CounterService) {}

  @Get('entries/today')
  async listTodayEntries(@CurrentUser() user: AuthUser): Promise<CounterEntry[]> {
    return unwrap(await this.counter.listTodayEntries(user.id))
  }
}
