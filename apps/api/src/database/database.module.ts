import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { ENV } from '../config/config.module'
import type { Env } from '../config/env'
import * as schema from './schema'

export const DB = Symbol('DB')
export const SQL = Symbol('SQL')
export type Database = PostgresJsDatabase<typeof schema>

@Global()
@Module({
  providers: [
    { provide: SQL, inject: [ENV], useFactory: (env: Env) => postgres(env.DATABASE_URL, { prepare: false }) },
    { provide: DB, inject: [SQL], useFactory: (sql: postgres.Sql): Database => drizzle(sql, { schema }) },
  ],
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(SQL) private readonly sql: postgres.Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.sql.end()
  }
}
