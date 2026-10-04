import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { TEST_DATABASE_URL, TestDatabase } from '../test-support/test-database'

/** Tabela nova sem RLS é a falha silenciosa mais cara do Supabase: este teste a transforma em erro de CI. */
describe.skipIf(!TEST_DATABASE_URL)('database safety net', () => {
  let data: TestDatabase

  beforeAll(() => {
    data = new TestDatabase(TEST_DATABASE_URL ?? '')
  })

  afterAll(async () => data.close())

  it('has row level security on every table of the public schema, with no policy opening them up', async () => {
    const unprotected = await data.db.execute(
      sql`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity`,
    )
    expect(unprotected.map((row) => row.relname)).toEqual([])
    const policies = await data.db.execute(sql`select tablename, policyname from pg_policies where schemaname = 'public'`)
    expect(policies).toHaveLength(0)
  })
})
