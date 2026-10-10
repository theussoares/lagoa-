import { Injectable, Logger } from '@nestjs/common'
import { Clock } from '../../common/clock'
import type { CounterToday } from '#shared/schemas/visit'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { startOfLocalDay } from '#shared/utils/time'
import { CounterRepository } from './counter.repository'

@Injectable()
export class CounterService {
  private readonly logger = new Logger(CounterService.name)

  constructor(
    private readonly repo: CounterRepository,
    private readonly clock: Clock,
  ) {}

  async listTodayEntries(ownerUserId: string): Promise<Result<CounterToday, ErrorOf<'notFound'>>> {
    const shop = await this.repo.findShopAndProgramByOwner(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const now = this.clock.now()
    // Dia da loja = dia no fuso do piloto, não o do servidor (serverless roda em UTC e "hoje" viraria 20h).
    return ok(await this.repo.listTodayEntries(shop.shopId, startOfLocalDay(now)))
  }
}
