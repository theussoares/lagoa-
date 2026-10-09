import type { WeekLedgerRecord } from '#shared/domain/weekSummary'

export abstract class HomeRepository {
  abstract listShopLedgerRecords(shopId: string): Promise<WeekLedgerRecord[]>
}
