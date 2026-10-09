import { Injectable } from '@nestjs/common'
import { summarizeWeek } from '#shared/domain/weekSummary'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { Clock } from '../../common/clock'
import { SessionRepository } from '../session/session.repository'
import { HomeRepository } from './home.repository'

@Injectable()
export class HomeService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly homeRepo: HomeRepository,
    private readonly clock: Clock,
  ) {}

  async getWeekSummary(ownerUserId: string): Promise<Result<WeekSummary, ErrorOf<'notFound'>>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const records = await this.homeRepo.listShopLedgerRecords(shop.id)
    const summary = summarizeWeek(records, this.clock.now())
    return ok(summary)
  }
}
