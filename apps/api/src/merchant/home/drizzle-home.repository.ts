import { Inject, Injectable } from '@nestjs/common'
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm'
import type { CustomerRegistrationRecord, LedgerComparisonRecord } from '#shared/domain/homeComparison'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import type { CustomerFilter } from '#shared/schemas/customer'
import { CustomerIdSchema } from '#shared/schemas/ids'
import type { IsoDateTime } from '#shared/schemas/common'
import type { PhoneNumber } from '#shared/schemas/phone'
import { LedgerKindSchema } from '#shared/schemas/visit'
import type { HomeActivityItem, HomeActivityKind } from '#shared/schemas/homeOverview'
import { maskPhone } from '#shared/utils/phone'
import { toIso } from '#shared/utils/time'
import { PiiService } from '../../common/pii.service'
import { DB, type Database } from '../../database/database.module'
import { appUsers, customerProfiles, ledgerEntries, loyaltyCards, programs, redemptions } from '../../database/schema'
import { filterCondition } from '../customers/drizzle-customers.repository'
import { HomeRepository } from './home.repository'

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
          customerId: row.customerId as any,
          kind: parsed.data,
          createdAt: toIso(row.occurredAt),
          amountCents: row.amountCents,
        },
      ]
    })
  }

  async countShopCustomersByFilter(shopId: string, filter: CustomerFilter, lapsedCutoff: Date): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(loyaltyCards)
      .innerJoin(programs, eq(programs.id, loyaltyCards.programId))
      .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
      .where(
        and(
          eq(loyaltyCards.shopId, shopId),
          isNull(appUsers.erasedAt),
          filterCondition(filter, lapsedCutoff),
        ),
      )
    return row?.count ?? 0
  }

  async getOldestLapsedVisit(shopId: string, lapsedCutoff: Date): Promise<IsoDateTime | null> {
    const [row] = await this.db
      .select({ lastVisitAt: loyaltyCards.lastVisitAt })
      .from(loyaltyCards)
      .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
      .where(
        and(
          eq(loyaltyCards.shopId, shopId),
          isNull(appUsers.erasedAt),
          lte(loyaltyCards.lastVisitAt, lapsedCutoff),
        ),
      )
      .orderBy(asc(loyaltyCards.lastVisitAt))
      .limit(1)

    return row?.lastVisitAt ? toIso(row.lastVisitAt) : null
  }

  async listComparisonRecords(shopId: string, since: Date): Promise<LedgerComparisonRecord[]> {
    const rows = await this.db
      .select({
        kind: ledgerEntries.kind,
        occurredAt: ledgerEntries.occurredAt,
        amountCents: ledgerEntries.amountCents,
      })
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.shopId, shopId),
          gte(ledgerEntries.occurredAt, since),
          inArray(ledgerEntries.kind, ['visit', 'amount', 'checkIn', 'redemption']),
        ),
      )

    return rows.flatMap((r) => {
      const parsed = LedgerKindSchema.safeParse(r.kind)
      if (!parsed.success) return []
      return [
        {
          kind: parsed.data,
          createdAt: toIso(r.occurredAt),
          amountCents: r.amountCents,
        },
      ]
    })
  }

  async listNewCardDates(shopId: string, since: Date): Promise<CustomerRegistrationRecord[]> {
    const rows = await this.db
      .select({
        customerId: loyaltyCards.customerId,
        createdAt: loyaltyCards.createdAt,
      })
      .from(loyaltyCards)
      .innerJoin(appUsers, eq(appUsers.id, loyaltyCards.customerId))
      .where(
        and(
          eq(loyaltyCards.shopId, shopId),
          isNull(appUsers.erasedAt),
          gte(loyaltyCards.createdAt, since),
        ),
      )

    return rows.map((r) => ({
      customerId: CustomerIdSchema.parse(r.customerId),
      createdAt: toIso(r.createdAt),
    }))
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
        .where(eq(redemptions.shopId, shopId))
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
        amountCents: row.amountCents,
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
