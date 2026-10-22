import { Inject, Injectable } from '@nestjs/common'
import { and, asc, desc, eq, gte, inArray, isNull, lt, lte, sql, type SQL } from 'drizzle-orm'
import type { DateRange } from '#shared/domain/homeComparison'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import { CustomerIdSchema } from '#shared/schemas/ids'
import type { IsoDateTime } from '#shared/schemas/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { LedgerKindSchema } from '#shared/schemas/visit'
import type { HomeActivityItem, HomeActivityKind, HomeMetrics, HomePeriod } from '#shared/schemas/homeOverview'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import { appUsers, customerProfiles, ledgerEntries, loyaltyCards, programs, redemptions } from '../../database/schema'
import { filterCondition } from '../customers/customer-filter.sql'
import { HomeRepository, type ShopCustomerMetrics } from './home.repository'

const PERIODS: readonly HomePeriod[] = ['week', 'month', 'last30']
const RANGE_KEYS = ['current', 'previous'] as const

@Injectable()
export class DrizzleHomeRepository extends HomeRepository {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly pii: PiiService,
  ) {
    super()
  }

  async listShopLedgerRecords(shopId: string): Promise<WeekLedgerRecord[]> {
    const rows = await this.db
      .select({
        customerId: ledgerEntries.customerId,
        kind: ledgerEntries.kind,
        occurredAt: ledgerEntries.occurredAt,
        amountCents: ledgerEntries.amountCents,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.shopId, shopId),
          inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn', 'redemption']),
        ),
      )
      .orderBy(asc(ledgerEntries.occurredAt), asc(ledgerEntries.id))

    return rows.flatMap((row) => {
      const parsed = LedgerKindSchema.safeParse(row.kind)
      if (!parsed.success) return []
      return [
        {
          customerId: CustomerIdSchema.parse(row.customerId),
          kind: parsed.data,
          createdAt: toIso(row.occurredAt),
          amountCents: row.amountCents,
        },
      ]
    })
  }

  async getCustomerMetrics(shopId: string, lapsedCutoff: Date): Promise<ShopCustomerMetrics> {
    const lapsedCond = filterCondition('lapsed', lapsedCutoff)
    const nearRewardCond = filterCondition('nearReward', lapsedCutoff)
    const rewardReadyCond = filterCondition('rewardReady', lapsedCutoff)

    const [row] = await this.db
      .select({
        total: sql<number>`count(*)::int`,
        lapsedTotal: lapsedCond ? sql<number>`count(*) FILTER (WHERE ${lapsedCond})::int` : sql<number>`0`,
        nearRewardTotal: nearRewardCond ? sql<number>`count(*) FILTER (WHERE ${nearRewardCond})::int` : sql<number>`0`,
        rewardReadyTotal: rewardReadyCond ? sql<number>`count(*) FILTER (WHERE ${rewardReadyCond})::int` : sql<number>`0`,
        oldestLastVisitAt: lapsedCond
          ? sql<Date | null>`min(${loyaltyCards.lastVisitAt}) FILTER (WHERE ${lapsedCond})`
          : sql<Date | null>`null`,
      })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
      .where(
        and(
          eq(loyaltyCards.shopId, shopId),
          isNull(appUsers.erasedAt),
        ),
      )

    return {
      total: row?.total ?? 0,
      lapsedTotal: row?.lapsedTotal ?? 0,
      nearRewardTotal: row?.nearRewardTotal ?? 0,
      rewardReadyTotal: row?.rewardReadyTotal ?? 0,
      oldestLastVisitAt: row?.oldestLastVisitAt ? toIso(row.oldestLastVisitAt) : null,
    }
  }

  async getComparisonMetrics(
    shopId: string,
    ranges: Record<HomePeriod, { current: DateRange; previous: DateRange }>,
  ): Promise<Record<HomePeriod, HomeMetrics>> {
    const minStart = ranges.last30.previous.start

    const ledgerSelectFields: Record<string, SQL<number>> = {}
    for (const p of PERIODS) {
      for (const k of RANGE_KEYS) {
        const range = ranges[p][k]
        const timeFilter = (range.inclusiveEnd ?? true)
          ? and(gte(ledgerEntries.occurredAt, range.start), lte(ledgerEntries.occurredAt, range.end))!
          : and(gte(ledgerEntries.occurredAt, range.start), lt(ledgerEntries.occurredAt, range.end))!

        const visitFilter = and(inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn']), timeFilter)!
        const purchaseFilter = and(
          inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn']),
          sql`${ledgerEntries.amountCents} > 0`,
          timeFilter,
        )!
        const redemptionFilter = and(eq(ledgerEntries.kind, 'redemption'), timeFilter)!

        ledgerSelectFields[`${p}_${k}_visits`] = sql<number>`count(*) FILTER (WHERE ${visitFilter})::int`
        ledgerSelectFields[`${p}_${k}_purchases`] = sql<number>`count(*) FILTER (WHERE ${purchaseFilter})::int`
        ledgerSelectFields[`${p}_${k}_redemptions`] = sql<number>`count(*) FILTER (WHERE ${redemptionFilter})::int`
      }
    }

    const cardSelectFields: Record<string, SQL<number>> = {}
    for (const p of PERIODS) {
      for (const k of RANGE_KEYS) {
        const range = ranges[p][k]
        const cardTimeFilter = (range.inclusiveEnd ?? true)
          ? and(gte(loyaltyCards.createdAt, range.start), lte(loyaltyCards.createdAt, range.end))!
          : and(gte(loyaltyCards.createdAt, range.start), lt(loyaltyCards.createdAt, range.end))!

        cardSelectFields[`${p}_${k}_newCustomers`] =
          sql<number>`count(DISTINCT ${loyaltyCards.customerId}) FILTER (WHERE ${cardTimeFilter})::int`
      }
    }

    const [[ledgerRow], [cardRow]] = await Promise.all([
      this.db
        .select(ledgerSelectFields)
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.shopId, shopId), gte(ledgerEntries.occurredAt, minStart))),
      this.db
        .select(cardSelectFields)
        .from(loyaltyCards)
        .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
        .where(
          and(
            eq(loyaltyCards.shopId, shopId),
            isNull(appUsers.erasedAt),
            gte(loyaltyCards.createdAt, minStart),
          ),
        ),
    ])

    const result = {} as Record<HomePeriod, HomeMetrics>
    for (const p of PERIODS) {
      result[p] = {
        newCustomers: {
          current: cardRow?.[`${p}_current_newCustomers`] ?? 0,
          previous: cardRow?.[`${p}_previous_newCustomers`] ?? 0,
        },
        visits: {
          current: ledgerRow?.[`${p}_current_visits`] ?? 0,
          previous: ledgerRow?.[`${p}_previous_visits`] ?? 0,
        },
        purchases: {
          current: ledgerRow?.[`${p}_current_purchases`] ?? 0,
          previous: ledgerRow?.[`${p}_previous_purchases`] ?? 0,
        },
        redemptions: {
          current: ledgerRow?.[`${p}_current_redemptions`] ?? 0,
          previous: ledgerRow?.[`${p}_previous_redemptions`] ?? 0,
        },
      }
    }

    return result
  }

  async listRecentActivity(shopId: string, limit: number): Promise<HomeActivityItem[]> {
    const [ledgerRows, redemptionRows] = await Promise.all([
      this.db
        .select({
          id: ledgerEntries.id,
          kind: ledgerEntries.kind,
          unitsDelta: ledgerEntries.unitsDelta,
          amountCents: ledgerEntries.amountCents,
          occurredAt: ledgerEntries.occurredAt,
          phoneEncrypted: appUsers.phoneEncrypted,
          erasedAt: appUsers.erasedAt,
          rewardTitle: redemptions.rewardTitle,
          programUnit: programs.unit,
          firstName: customerProfiles.firstName,
          customerId: ledgerEntries.customerId,
        })
        .from(ledgerEntries)
        .innerJoin(appUsers, eq(appUsers.id, ledgerEntries.customerId))
        .leftJoin(customerProfiles, eq(customerProfiles.userId, ledgerEntries.customerId))
        .leftJoin(redemptions, eq(redemptions.id, ledgerEntries.redemptionId))
        .innerJoin(loyaltyCards, eq(loyaltyCards.id, ledgerEntries.cardId))
        .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
        .where(
          and(
            eq(ledgerEntries.shopId, shopId),
            inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn', 'welcomeBonus', 'referralBonus', 'redemption']),
          ),
        )
        .orderBy(sql`${ledgerEntries.occurredAt} desc nulls last`, sql`${ledgerEntries.id} desc nulls last`)
        .limit(limit),

      this.db
        .select({
          id: redemptions.id,
          rewardTitle: redemptions.rewardTitle,
          createdAt: redemptions.createdAt,
          phoneEncrypted: appUsers.phoneEncrypted,
          erasedAt: appUsers.erasedAt,
          programUnit: programs.unit,
          target: programs.target,
          firstName: customerProfiles.firstName,
          customerId: loyaltyCards.customerId,
        })
        .from(redemptions)
        .innerJoin(loyaltyCards, eq(loyaltyCards.id, redemptions.cardId))
        .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
        .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
        .leftJoin(customerProfiles, eq(customerProfiles.userId, loyaltyCards.customerId))
        .where(
          and(
            eq(redemptions.shopId, shopId),
            eq(redemptions.status, 'active'),
          ),
        )
        .orderBy(desc(redemptions.createdAt))
        .limit(limit),
    ])

    const items: HomeActivityItem[] = []

    for (const row of ledgerRows) {
      let kind: HomeActivityKind = 'visit'
      if (row.kind === 'redemption') {
        kind = 'redemption'
      } else if (row.amountCents !== null && row.amountCents !== undefined && row.amountCents > 0) {
        kind = 'purchase'
      } else if (row.kind === 'welcomeBonus' || row.kind === 'referralBonus') {
        kind = 'bonus'
      }

      items.push({
        id: `ledger_${row.id}`,
        kind,
        customerId: CustomerIdSchema.parse(row.customerId),
        name: row.erasedAt !== null ? null : row.firstName,
        maskedPhone: this.maskedPhoneOf(row.phoneEncrypted, row.erasedAt),
        units: Math.abs(row.unitsDelta),
        unit: row.programUnit,
        amountCents: row.amountCents !== null && row.amountCents !== undefined && row.amountCents > 0 ? row.amountCents : null,
        rewardTitle: row.rewardTitle,
        createdAt: toIso(row.occurredAt),
      })
    }

    for (const row of redemptionRows) {
      items.push({
        id: `redemption_${row.id}`,
        kind: 'rewardReleased',
        customerId: CustomerIdSchema.parse(row.customerId),
        name: row.erasedAt !== null ? null : row.firstName,
        maskedPhone: this.maskedPhoneOf(row.phoneEncrypted, row.erasedAt),
        units: row.target,
        unit: row.programUnit,
        amountCents: null,
        rewardTitle: row.rewardTitle,
        createdAt: toIso(row.createdAt),
      })
    }

    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
  }

  private maskedPhoneOf(phoneEncrypted: Buffer, erasedAt: Date | null): ReturnType<typeof maskPhone> | null {
    if (erasedAt !== null) return null
    try {
      return maskPhone(this.pii.decrypt(phoneEncrypted) as PhoneNumber)
    } catch {
      return null
    }
  }
}
