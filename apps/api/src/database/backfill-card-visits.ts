import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { parseEnv } from '../config/env'
import type { Database } from './database.module'

/**
 * Recalcula `visits_count` e `first_visit_at` de todos os cartões a partir do ledger (a fonte da verdade).
 * Idempotente: recalcula, não soma. Rodar depois do deploy do código que mantém os contadores, para cobrir as visitas
 * gravadas entre a migration 0019 e o deploy. Devolve quantos cartões tinham visitas.
 */
export async function backfillCardVisits(db: Pick<Database, 'execute'>): Promise<number> {
  const rows = await db.execute<{ id: string }>(sql`
    update loyalty_cards c set visits_count = v.n, first_visit_at = v.first_at
    from (
      select card_id, count(*)::int as n, min(occurred_at) as first_at
      from ledger_entries where counts_as_visit group by card_id
    ) v
    where c.id = v.card_id and (c.visits_count <> v.n or c.first_visit_at is distinct from v.first_at)
    returning c.id`)
  return rows.length
}

async function main(): Promise<void> {
  const client = postgres(parseEnv(process.env).DATABASE_URL, { prepare: false })
  try {
    const changed = await backfillCardVisits(drizzle(client))
    console.log(`Backfill ok: ${changed} cards updated`)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Backfill failed')
    process.exitCode = 1
  })
}
