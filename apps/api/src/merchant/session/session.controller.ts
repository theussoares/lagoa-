import { Controller, Get } from '@nestjs/common'
import type { MerchantSession } from '#shared/schemas/session'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { SessionService } from './session.service'

@Controller('merchant/session')
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Get()
  async current(@CurrentUser() user: AuthUser): Promise<MerchantSession> {
    return unwrap(await this.sessions.current(user.id))
  }
}
