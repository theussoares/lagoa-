// Confere quais migrations do `drizzle/` um banco já aplicou, pelo hash do SQL (o mesmo que o drizzle-kit grava).
//   node scripts/check-db-parity.mjs <url> --exact    banco de teste: tem de ter TODAS as migrations do repo, nenhuma a mais
//   node scripts/check-db-parity.mjs <url> --behind   banco de produção: só pode estar atrás do repo (prefixo), nunca diferente
// Sai com código 1 se a regra não vale. Não escreve em banco nenhum.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import postgres from 'postgres'

const [url, mode] = process.argv.slice(2)
if (!url || (mode !== '--exact' && mode !== '--behind')) {
  console.error('uso: check-db-parity.mjs <url> --exact|--behind')
  process.exit(2)
}

const drizzleDir = resolve(import.meta.dirname, '..', 'drizzle')
const journal = JSON.parse(readFileSync(join(drizzleDir, 'meta', '_journal.json'), 'utf8'))
const expected = journal.entries.map((entry) =>
  createHash('sha256').update(readFileSync(join(drizzleDir, `${entry.tag}.sql`), 'utf8')).digest('hex'),
)

const sql = postgres(url, { max: 1, prepare: false })
let applied = []
try {
  const [table] = await sql`select to_regclass('drizzle.__drizzle_migrations') as name`
  if (table?.name) applied = (await sql`select hash from drizzle.__drizzle_migrations order by id`).map((row) => row.hash)
} finally {
  await sql.end()
}

const diverged = applied.findIndex((hash, index) => hash !== expected[index])
const extra = applied.length > expected.length
if (diverged !== -1 || extra) {
  const at = diverged === -1 ? expected.length : diverged
  console.error(`O banco tem migration que o repo não tem, ou diferente (a partir da ${at}): não é seguro seguir.`)
  process.exit(1)
}
if (mode === '--exact' && applied.length !== expected.length) {
  console.error(`Banco de teste atrasado: ${applied.length} de ${expected.length} migrations aplicadas. Rode pnpm db:migrate:local.`)
  process.exit(1)
}
console.log(`ok: ${applied.length} de ${expected.length} migrations aplicadas (${mode.slice(2)})`)
