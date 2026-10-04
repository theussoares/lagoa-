import { Inject, Injectable } from '@nestjs/common'
import { count, desc, eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { ledgerEntries, loyaltyCards, redemptions, referrals, shops } from '../../database/schema'
import {
  type CardRecord,
  DataExportRepository,
  type LedgerRecord,
  type ReferralCounts,
  type RedemptionRecord,
} from './data-export.repository'

@Injectable()
export class DrizzleDataExportRepository extends DataExportRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async cards(customerId: string): Promise<CardRecord[]> {
    return this.db
      .select({ shopName: shops.name, balance: loyaltyCards.balance, createdAt: loyaltyCards.createdAt, lastVisitAt: loyaltyCards.lastVisitAt })
      .from(loyaltyCards)
      .innerJoin(shops, eq(shops.id, loyaltyCards.shopId))
      .where(eq(loyaltyCards.customerId, customerId))
      .orderBy(desc(loyaltyCards.id))
      .limit(500)
  }

  async ledger(customerId: string, limit: number): Promise<LedgerRecord[]> {
    return this.db
      .select({ shopName: shops.name, kind: ledgerEntries.kind, units: ledgerEntries.unitsDelta, occurredAt: ledgerEntries.occurredAt })
      .from(ledgerEntries)
      .innerJoin(shops, eq(shops.id, ledgerEntries.shopId))
      .where(eq(ledgerEntries.customerId, customerId))
      .orderBy(sql`${ledgerEntries.occurredAt} desc nulls last`, sql`${ledgerEntries.id} desc nulls last`)
      .limit(limit)
  }

  async redemptions(customerId: string, limit: number): Promise<RedemptionRecord[]> {
    return this.db
      .select({
        shopName: shops.name,
        rewardTitle: redemptions.rewardTitle,
        status: redemptions.status,
        createdAt: redemptions.createdAt,
        redeemedAt: redemptions.redeemedAt,
      })
      .from(redemptions)
      .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
      .innerJoin(shops, eq(shops.id, redemptions.shopId))
      .where(eq(loyaltyCards.customerId, customerId))
      .orderBy(sql`${redemptions.createdAt} desc nulls last`, sql`${redemptions.id} desc nulls last`)
      .limit(limit)
  }

  async referralCounts(customerId: string): Promise<ReferralCounts> {
    const rows = await this.db.select({ status: referrals.status, total: count() }).from(referrals).where(eq(referrals.referrerId, customerId)).groupBy(referrals.status)
    const of = (status: string): number => rows.find((row) => row.status === status)?.total ?? 0
    return { pending: of('pending'), rewarded: of('rewarded'), rejected: of('rejected') }
  }
}
