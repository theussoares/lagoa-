import { Inject, Injectable } from '@nestjs/common'
import { and, count, eq, gte, lt, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { customerProfiles, ledgerEntries } from '../../database/schema'
import { type RankedRow, RankingRepository, type RankingMembership, type RankingWindow } from './ranking.repository'

type RankedRowRaw = { user_id: string; position: number | string; name: string; visits: number | string }

@Injectable()
export class DrizzleRankingRepository extends RankingRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async topAndMe(userId: string, { start, end }: RankingWindow, top: number): Promise<RankedRow[]> {
    // Desempate: quem chegou àquele número primeiro fica na frente (`last_at` menor), depois o id.
    const rows = await this.db.execute<RankedRowRaw>(sql`
      with scores as (
        select c.user_id, c.ranking_name as name, count(*)::int as visits, max(l.occurred_at) as last_at
        from customer_profiles c
        join ledger_entries l on l.customer_id = c.user_id
        where c.ranking_opt_in and c.ranking_name is not null
          and l.counts_as_visit and l.occurred_at >= ${start.toISOString()} and l.occurred_at < ${end.toISOString()}
        group by c.user_id, c.ranking_name
      ), ranked as (
        select user_id, name, visits, row_number() over (order by visits desc, last_at asc, user_id asc)::int as position
        from scores
      )
      select user_id, position, name, visits from ranked
      where position <= ${top} or user_id = ${userId}
      order by position asc
    `)
    return [...rows].map((row) => ({ userId: row.user_id, position: Number(row.position), name: row.name, visits: Number(row.visits) }))
  }

  async visitsOf(userId: string, { start, end }: RankingWindow): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.customerId, userId), eq(ledgerEntries.countsAsVisit, true), gte(ledgerEntries.occurredAt, start), lt(ledgerEntries.occurredAt, end)))
    return row?.total ?? 0
  }

  async membership(userId: string): Promise<RankingMembership | null> {
    const [row] = await this.db
      .select({ optedIn: customerProfiles.rankingOptIn, name: customerProfiles.rankingName })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .limit(1)
    return row ?? null
  }

  async setMembership(userId: string, { optedIn, name }: RankingMembership): Promise<boolean> {
    const updated = await this.db
      .update(customerProfiles)
      .set({ rankingOptIn: optedIn, rankingName: optedIn ? name : null })
      .where(eq(customerProfiles.userId, userId))
      .returning({ id: customerProfiles.userId })
    return updated.length > 0
  }
}
