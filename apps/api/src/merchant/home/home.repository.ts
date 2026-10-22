import type { IsoDateTime } from '#shared/schemas/common'
import type { DateRange } from '#shared/domain/homeComparison'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import type { HomeActivityItem, HomeMetrics, HomePeriod } from '#shared/schemas/homeOverview'

export interface ShopCustomerMetrics {
  readonly total: number
  readonly lapsedTotal: number
  readonly nearRewardTotal: number
  readonly rewardReadyTotal: number
  readonly oldestLastVisitAt: IsoDateTime | null
}

export abstract class HomeRepository {
  abstract listShopLedgerRecords(shopId: string): Promise<WeekLedgerRecord[]>
  abstract getCustomerMetrics(shopId: string, lapsedCutoff: Date): Promise<ShopCustomerMetrics>
  abstract getComparisonMetrics(
    shopId: string,
    ranges: Record<HomePeriod, { current: DateRange; previous: DateRange }>,
  ): Promise<Record<HomePeriod, HomeMetrics>>
  abstract listRecentActivity(shopId: string, limit: number): Promise<HomeActivityItem[]>
}
