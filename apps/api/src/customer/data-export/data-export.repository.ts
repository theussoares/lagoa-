export interface CardRecord {
  readonly shopName: string
  readonly balance: number
  readonly createdAt: Date
  readonly lastVisitAt: Date | null
}
export interface LedgerRecord {
  readonly shopName: string
  readonly kind: string
  readonly units: number
  readonly occurredAt: Date
}
export interface RedemptionRecord {
  readonly shopName: string
  readonly rewardTitle: string
  readonly status: string
  readonly createdAt: Date
  readonly redeemedAt: Date | null
}
export interface ReferralCounts {
  readonly pending: number
  readonly rewarded: number
  readonly rejected: number
}

export abstract class DataExportRepository {
  abstract cards(customerId: string): Promise<CardRecord[]>
  /** Os lançamentos mais novos primeiro, até `limit`. */
  abstract ledger(customerId: string, limit: number): Promise<LedgerRecord[]>
  abstract redemptions(customerId: string, limit: number): Promise<RedemptionRecord[]>
  abstract referralCounts(customerId: string): Promise<ReferralCounts>
}
