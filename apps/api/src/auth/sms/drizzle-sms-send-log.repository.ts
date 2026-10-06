import { Inject, Injectable } from '@nestjs/common'
import { and, eq, lt, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { DB, type Database } from '../../database/database.module'
import { smsSends } from '../../database/schema'
import { SmsSendLog } from './sms-send-log.repository'

@Injectable()
export class DrizzleSmsSendLog extends SmsSendLog {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async tryRecord(phoneHash: Buffer, now: Date, windowStart: Date, max: number): Promise<boolean> {
    const inserted = await this.db.execute(sql`
      insert into ${smsSends} (id, phone_hash, sent_at)
      select ${uuidv7()}, ${phoneHash}, ${now}
      where (select count(*) from ${smsSends} where ${and(eq(smsSends.phoneHash, phoneHash), sql`${smsSends.sentAt} > ${windowStart}`)}) < ${max}
      returning id
    `)
    await this.db.delete(smsSends).where(lt(smsSends.sentAt, windowStart))
    return inserted.length > 0
  }
}
