import type { CustomerFilter } from '#shared/schemas/customer'
import type { IsoDateTime } from '#shared/schemas/common'
import type { CustomerRegistrationRecord, LedgerComparisonRecord } from '#shared/domain/homeComparison'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import type { HomeActivityItem } from '#shared/schemas/homeOverview'

export abstract class HomeRepository {
  abstract listShopLedgerRecords(shopId: string): Promise<WeekLedgerRecord[]>
  abstract countShopCustomersByFilter(shopId: string, filter: CustomerFilter, lapsedCutoff: Date): Promise<number>
  abstract getOldestLapsedVisit(shopId: string, lapsedCutoff: Date): Promise<IsoDateTime | null>
  abstract listComparisonRecords(shopId: string, since: Date): Promise<LedgerComparisonRecord[]>
  abstract listNewCardDates(shopId: string, since: Date): Promise<CustomerRegistrationRecord[]>
  abstract listRecentActivity(shopId: string, limit: number): Promise<HomeActivityItem[]>
}
