import { Controller, Get, Inject } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { DB, type Database } from '../database/database.module'

@Controller('health')
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    await this.db.execute(sql`select 1`)
    return { status: 'ok' }
  }
}
