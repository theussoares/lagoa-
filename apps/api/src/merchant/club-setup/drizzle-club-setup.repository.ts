import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { programs, shops } from '../../database/schema'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopStatus } from '#shared/schemas/shop'
import {
  type CreatedClub,
  type PosterData,
  ClubSetupRepository,
} from './club-setup.repository'
import { mapDraftToProgramInsert } from './club-setup.rules'

@Injectable()
export class DrizzleClubSetupRepository extends ClubSetupRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findShopByOwner(ownerUserId: string): Promise<{ id: string; status: ShopStatus } | null> {
    const [shop] = await this.db
      .select({ id: shops.id, status: shops.status })
      .from(shops)
      .where(eq(shops.ownerUserId, ownerUserId))
      .limit(1)

    return shop ?? null
  }

  async createClub(ownerUserId: string, draft: ClubSetupDraft, checkInCode: string): Promise<CreatedClub> {
    return this.db.transaction(async (tx) => {
      const [insertedShop] = await tx
        .insert(shops)
        .values({
          ownerUserId,
          name: draft.shop.name,
          category: draft.shop.category,
          neighborhood: draft.shop.neighborhood,
          addressLine: draft.shop.addressLine,
          checkInCode,
          status: 'pending',
        })
        .returning({ id: shops.id, name: shops.name, status: shops.status })

      if (!insertedShop) {
        throw new Error('Failed to insert shop')
      }

      await tx.insert(programs).values(mapDraftToProgramInsert(insertedShop.id, draft.program))

      return {
        shopId: insertedShop.id,
        shopName: insertedShop.name,
        shopStatus: insertedShop.status,
      }
    })
  }

  async getPoster(ownerUserId: string): Promise<PosterData | null> {
    const [row] = await this.db
      .select({
        shopName: shops.name,
        status: shops.status,
        checkInCode: shops.checkInCode,
        rewardTitle: programs.rewardTitle,
        unit: programs.unit,
        target: programs.target,
      })
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(eq(shops.ownerUserId, ownerUserId))
      .limit(1)

    return row ?? null
  }

  async getStatus(ownerUserId: string): Promise<ShopStatus | null> {
    const [shop] = await this.db
      .select({ status: shops.status })
      .from(shops)
      .where(eq(shops.ownerUserId, ownerUserId))
      .limit(1)

    return shop ? shop.status : null
  }

  async approveShop(ownerUserId: string): Promise<ShopStatus | null> {
    const [updated] = await this.db
      .update(shops)
      .set({ status: 'approved' })
      .where(eq(shops.ownerUserId, ownerUserId))
      .returning({ status: shops.status })

    return updated ? updated.status : null
  }
}
