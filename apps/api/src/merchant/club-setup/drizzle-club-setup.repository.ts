import { Inject, Injectable } from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { appUsers, programs, shops } from '../../database/schema'
import type { ClubSetupDraft } from '#shared/schemas/onboarding'
import type { ShopStatus } from '#shared/schemas/shop'
import { ensureAppUser, type NewAppUser } from '../../accounts/app-user.writer'
import { uniqueViolationConstraint } from '../../database/unique-violation'
import {
  type CreateClubOutcome,
  type PosterData,
  ClubSetupRepository,
} from './club-setup.repository'
import { mapDraftToProgramInsert } from './club-setup.rules'

const CHECK_IN_CODE_ATTEMPTS = 5

@Injectable()
export class DrizzleClubSetupRepository extends ClubSetupRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async createClub(owner: NewAppUser, draft: ClubSetupDraft, newCheckInCode: () => string, now: Date): Promise<CreateClubOutcome> {
    // A colisão do código de check-in aborta a transação inteira no Postgres: o retry refaz tudo, não só o insert.
    for (let attempt = 0; attempt < CHECK_IN_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.createOnce(owner, draft, newCheckInCode(), now)
      } catch (error) {
        const constraint = uniqueViolationConstraint(error)
        if (constraint === 'app_users_phone_hash_unique') return { kind: 'phoneTaken' }
        if (constraint !== 'shops_check_in_code_unique') throw error
      }
    }
    throw new Error('Could not allocate a unique check-in code')
  }

  private createOnce(owner: NewAppUser, draft: ClubSetupDraft, checkInCode: string, now: Date): Promise<CreateClubOutcome> {
    return this.db.transaction(async (tx) => {
      await ensureAppUser(tx, owner)
      // `FOR SHARE` pareia com o `FOR UPDATE` do `erase`: ou a conta é apagada antes (e aqui para) ou a loja nasce antes
      // (e o `erase` recusa com `ownsShop`). O JWT segue válido depois de apagar a conta, então só `erased_at` barra.
      const [account] = await tx.select({ erasedAt: appUsers.erasedAt }).from(appUsers).where(eq(appUsers.id, owner.userId)).for('share')
      if (account?.erasedAt) return { kind: 'accountErased' }
      const [insertedShop] = await tx
        .insert(shops)
        .values({
          ownerUserId: owner.userId,
          name: draft.shop.name,
          category: draft.shop.category,
          neighborhood: draft.shop.neighborhood,
          addressLine: draft.shop.addressLine,
          checkInCode,
          status: 'pending',
          // Loja nova já imprime o cartaz certo: o aviso de "cartaz novo" é só das lojas antigas.
          posterReprintedAt: now,
        })
        .onConflictDoNothing({ target: shops.ownerUserId })
        .returning({ id: shops.id, name: shops.name, status: shops.status })

      if (!insertedShop) {
        const [existing] = await tx.select({ id: shops.id, name: shops.name, status: shops.status }).from(shops).where(eq(shops.ownerUserId, owner.userId)).limit(1)
        if (!existing) throw new Error('Shop vanished after conflict')
        return { kind: 'existing', club: { shopId: existing.id, shopName: existing.name, shopStatus: existing.status } }
      }

      await tx.insert(programs).values(mapDraftToProgramInsert(insertedShop.id, draft.program))
      return { kind: 'created', club: { shopId: insertedShop.id, shopName: insertedShop.name, shopStatus: insertedShop.status } }
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

  async isPosterReprintPending(ownerUserId: string): Promise<boolean | null> {
    const [shop] = await this.db.select({ at: shops.posterReprintedAt }).from(shops).where(eq(shops.ownerUserId, ownerUserId)).limit(1)
    return shop ? shop.at === null : null
  }

  async markPosterReprinted(ownerUserId: string, now: Date): Promise<boolean | null> {
    const [shop] = await this.db
      .update(shops)
      .set({ posterReprintedAt: sql`coalesce(${shops.posterReprintedAt}, ${now.toISOString()}::timestamptz)` })
      .where(eq(shops.ownerUserId, ownerUserId))
      .returning({ id: shops.id })
    return shop ? false : null
  }
}
