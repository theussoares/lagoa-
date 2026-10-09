import { Controller, Get } from '@nestjs/common'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { HomeService } from './home.service'

@Controller('merchant/home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get('summary')
  async summary(@CurrentUser() user: AuthUser): Promise<WeekSummary> {
    return unwrap(await this.home.getWeekSummary(user.id))
  }

  @Get('week-summary')
  async weekSummary(@CurrentUser() user: AuthUser): Promise<WeekSummary> {
    return unwrap(await this.home.getWeekSummary(user.id))
  }
}
