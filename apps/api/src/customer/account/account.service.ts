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

  async erase(userId: string): Promise<Result<void, ErrorOf<'notFound' | 'accountOwnsShop'>>> {
    const outcome = await this.repository.erase(userId, this.clock.now())
    if (outcome === 'ownsShop') return err({ code: 'accountOwnsShop' })
    return outcome === 'erased' ? ok(undefined) : err({ code: 'notFound', entity: 'customer' })
  }
}
