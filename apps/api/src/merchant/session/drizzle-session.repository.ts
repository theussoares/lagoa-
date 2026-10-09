import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { type MerchantShopRecord, SessionRepository } from './session.repository'

@Injectable()
export class DrizzleSessionRepository extends SessionRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findByOwnerUserId(userId: string): Promise<MerchantShopRecord | null> {
    const [shop] = await this.db
      .select({
        id: shops.id,
        ownerUserId: shops.ownerUserId,
        name: shops.name,
        status: shops.status,
      })
      .from(shops)
      .where(eq(shops.ownerUserId, userId))
      .limit(1)

    return shop ?? null
  }
}
