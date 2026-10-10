import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { parseEnv } from '../config/env'
import type { Database } from './database.module'

/**
 * Recalcula `visits_count` e `first_visit_at` dos cartões a partir do ledger (a fonte da verdade). Idempotente:
 * recalcula, não soma. Rodar depois do deploy do código que mantém os contadores, para cobrir as visitas gravadas entre
 * a migration 0019 e o deploy. Devolve quantos cartões foram corrigidos.
 *
 * Cartão a cartão: trava a linha (`FOR UPDATE`, a mesma trava do `LedgerStore`) e só então conta, em outro comando. Um
 * `UPDATE ... FROM (subquery)` em lote leria o ledger antes de esperar o lock e gravaria um número velho por cima de um
 * check-in que acabou de confirmar.
 */
export async function backfillCardVisits(db: Pick<Database, 'execute' | 'transaction'>): Promise<number> {
  // Pré-filtro barato e sem trava: só os cartões que parecem fora de passo; a conferência de verdade é sob o lock.
  const suspects = await db.execute<{ id: string }>(sql`
    select c.id from loyalty_cards c
    left join (
      select card_id, count(*)::int as n, min(occurred_at) as first_at
      from ledger_entries where counts_as_visit group by card_id
    ) v on v.card_id = c.id
    where c.visits_count <> coalesce(v.n, 0) or c.first_visit_at is distinct from v.first_at`)
  let fixed = 0
  for (const { id } of suspects) {
    const changed = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from loyalty_cards where id = ${id} for update`)
      const updated = await tx.execute(sql`
        update loyalty_cards c set visits_count = v.n, first_visit_at = v.first_at
        from (
          select count(*)::int as n, min(occurred_at) as first_at
          from ledger_entries where card_id = ${id} and counts_as_visit
        ) v
        where c.id = ${id} and (c.visits_count <> v.n or c.first_visit_at is distinct from v.first_at)
        returning c.id`)
      return updated.length
    })
    fixed += changed
  }
  return fixed
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
