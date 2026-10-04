import { Controller, Delete, HttpCode } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { AuthUser } from '../../auth/auth.types'
import { CurrentUser } from '../../auth/current-user.decorator'
import { unwrap } from '../../common/http/domain-exception'
import { AccountService } from './account.service'

@Controller('customer/account')
export class AccountController {
  constructor(private readonly accounts: AccountService) {}

  /** Direito de eliminação (LGPD): sem volta. O app confirma com a pessoa antes de chamar. */
  @Delete()
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: 60_000 }, ip: { limit: 30, ttl: 60_000 } })
  async erase(@CurrentUser() user: AuthUser): Promise<void> {
    unwrap(await this.accounts.erase(user.id))
  }
}
