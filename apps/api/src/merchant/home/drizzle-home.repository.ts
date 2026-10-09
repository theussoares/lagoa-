import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { WeekLedgerRecord } from '#shared/domain/weekSummary'
import type { CustomerId } from '#shared/schemas/ids'
import { LedgerKindSchema } from '#shared/schemas/visit'
import { toIso } from '#shared/utils/time'
import { DB, type Database } from '../../database/database.module'
import { ledgerEntries } from '../../database/schema/cards'
import { HomeRepository } from './home.repository'

@Injectable()
export class DrizzleHomeRepository extends HomeRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listShopLedgerRecords(shopId: string): Promise<WeekLedgerRecord[]> {
    const rows = await this.db
      .select({
        customerId: ledgerEntries.customerId,
        kind: ledgerEntries.kind,
        occurredAt: ledgerEntries.occurredAt,
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
          customerId: row.customerId as CustomerId,
          kind: parsed.data,
          createdAt: toIso(row.occurredAt),
        },
      ]
    })
  }
}
