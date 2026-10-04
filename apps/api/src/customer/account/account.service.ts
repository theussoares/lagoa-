import { Injectable } from '@nestjs/common'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { AccountRepository } from './account.repository'

@Injectable()
export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly clock: Clock,
  ) {}

  async erase(userId: string): Promise<Result<void, ErrorOf<'notFound'>>> {
    return (await this.repository.erase(userId, this.clock.now())) ? ok(undefined) : err({ code: 'notFound', entity: 'customer' })
  }
}
