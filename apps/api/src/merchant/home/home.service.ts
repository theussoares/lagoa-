import { Injectable } from '@nestjs/common'
import { HOME_ACTIVITY_LIMIT } from '#shared/constants/domain'
import { lapsedCutoff } from '#shared/domain/customer'
import { summarizeComparison } from '#shared/domain/homeComparison'
import { summarizeWeek } from '#shared/domain/weekSummary'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { addDays, startOfLocalDay } from '#shared/utils/time'
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

  async getOverview(ownerUserId: string): Promise<Result<HomeOverview, ErrorOf<'notFound'>>> {
    const shop = await this.sessionRepo.findByOwnerUserId(ownerUserId)
    if (!shop) return err({ code: 'notFound', entity: 'merchant' })

    const now = this.clock.now()
    const cutoff = lapsedCutoff(now)
    const comparisonSince = addDays(startOfLocalDay(now), -65)

    const [
      lapsedTotal,
      oldestLastVisitAt,
      nearRewardTotal,
      rewardReadyTotal,
      totalCustomers,
      comparisonRecords,
      newCardDates,
      activity,
    ] = await Promise.all([
      this.homeRepo.countShopCustomersByFilter(shop.id, 'lapsed', cutoff),
      this.homeRepo.getOldestLapsedVisit(shop.id, cutoff),
      this.homeRepo.countShopCustomersByFilter(shop.id, 'nearReward', cutoff),
      this.homeRepo.countShopCustomersByFilter(shop.id, 'rewardReady', cutoff),
      this.homeRepo.countShopCustomersByFilter(shop.id, 'all', cutoff),
      this.homeRepo.listComparisonRecords(shop.id, comparisonSince),
      this.homeRepo.listNewCardDates(shop.id, comparisonSince),
      this.homeRepo.listRecentActivity(shop.id, HOME_ACTIVITY_LIMIT),
    ])

    const comparison = summarizeComparison(comparisonRecords, newCardDates, now)

    return ok({
      lapsed: {
        total: lapsedTotal,
        oldestLastVisitAt,
      },
      nearReward: {
        total: nearRewardTotal,
      },
      rewardReady: {
        total: rewardReadyTotal,
      },
      totalCustomers,
      comparison,
      activity,
    })
  }
}
