import { Injectable, Logger } from '@nestjs/common'
import { Clock } from '../../common/clock'
import type { CounterEntry } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { CounterRepository } from './counter.repository'

@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name)

  constructor(
    private readonly repo: CounterRepository,
    private readonly clock: Clock,
  ) {}

  async listTodayEntries(ownerUserId: string): Promise<Result<CounterEntry[], ErrorOf<'notFound'>>> {
    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const now = this.clock.now()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const entries = await this.repo.listTodayEntries(shop.shopId, startOfDay)
    return ok(entries)
  }
}
