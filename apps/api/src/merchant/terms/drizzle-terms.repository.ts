import { Inject, Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { MerchantTermsRepository } from './terms.repository'

@Injectable()
export class DrizzleMerchantTermsRepository extends MerchantTermsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async accept(ownerUserId: string, version: string, now: Date): Promise<boolean> {
    const [row] = await this.db
      .update(shops)
      .set({
        merchantTermsVersion: version,
        // Repetir o aceite da mesma versão não reescreve a prova do primeiro.
        merchantTermsAcceptedAt: sql`case when ${shops.merchantTermsVersion} = ${version} then ${shops.merchantTermsAcceptedAt} else ${now.toISOString()}::timestamptz end`,
      })
      .where(eq(shops.ownerUserId, ownerUserId))
      .returning({ id: shops.id })
    return row !== undefined
  }
}
