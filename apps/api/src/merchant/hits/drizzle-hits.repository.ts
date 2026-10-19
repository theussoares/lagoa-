import { Inject, Injectable } from '@nestjs/common'
import { and, eq, ne, sql } from 'drizzle-orm'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { hitItemStatusEvents, hitItems, shops } from '../../database/schema'
import { type HitItemDraftValues, type HitItemPatch, type HitItemRow, HitsRepository } from './hits.repository'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type MutationError = ErrorOf<'notFound' | 'limitReached' | 'invalidTransition'>

/** Uma loja nunca tem mais que isso de ativos além do teto do plano; é só rede de segurança da consulta. */
const ACTIVE_LIST_SAFETY_LIMIT = 200

@Injectable()
export class DrizzleHitsRepository extends HitsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findForShop(shopId: string, id: string): Promise<HitItemRow | null> {
    const [row] = await this.db
      .select()
      .from(hitItems)
      .where(and(eq(hitItems.id, id), eq(hitItems.shopId, shopId)))
      .limit(1)
    return row ?? null
  }

  async listForShop(shopId: string, archivedLimit: number): Promise<readonly HitItemRow[]> {
    const [active, archived] = await Promise.all([
      this.db
        .select()
        .from(hitItems)
        .where(and(eq(hitItems.shopId, shopId), ne(hitItems.status, 'archived')))
        .orderBy(sql`${hitItems.createdAt} desc nulls last`)
        .limit(ACTIVE_LIST_SAFETY_LIMIT),
      this.db
        .select()
        .from(hitItems)
        .where(and(eq(hitItems.shopId, shopId), eq(hitItems.status, 'archived')))
        .orderBy(sql`${hitItems.createdAt} desc nulls last`)
        .limit(archivedLimit),
    ])
    return [...active, ...archived].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async insert(
    shopId: string,
    draft: HitItemDraftValues,
    canCreate: (activeCount: number) => Result<void, ErrorOf<'limitReached'>>,
  ): Promise<Result<HitItemRow, ErrorOf<'limitReached'>>> {
    return this.db.transaction(async (tx) => {
      await lockShop(tx, shopId)
      const allowed = canCreate(await countActive(tx, shopId))
      if (!allowed.ok) return allowed
      const [row] = await tx.insert(hitItems).values({ shopId, ...draft }).returning()
      if (!row) throw new Error('hit item insert returned no row')
      return ok(row)
    })
  }

  async updateLocked(
    shopId: string,
    id: string,
    mutate: (row: HitItemRow, activeCount: number) => Result<HitItemPatch, MutationError>,
  ): Promise<Result<HitItemRow, MutationError>> {
    return this.db.transaction(async (tx) => {
      // Sempre loja antes do item: a mesma ordem em toda escrita evita deadlock e serializa o teto.
      await lockShop(tx, shopId)
      const [current] = await tx
        .select()
        .from(hitItems)
        .where(and(eq(hitItems.id, id), eq(hitItems.shopId, shopId)))
        .for('update')
      if (!current) return err({ code: 'notFound', entity: 'hitItem' })
      const decision = mutate(current, await countActive(tx, shopId))
      if (!decision.ok) return decision
      const [saved] = await tx
        .update(hitItems)
        .set({ ...decision.value, updatedAt: new Date() })
        .where(and(eq(hitItems.id, id), eq(hitItems.shopId, shopId)))
        .returning()
      if (!saved) throw new Error('hit item update returned no row')
      if (saved.status !== current.status) {
        await tx.insert(hitItemStatusEvents).values({ hitItemId: id, fromStatus: current.status, toStatus: saved.status, actorAdminId: null })
      }
      return ok(saved)
    })
  }
}

async function lockShop(tx: Tx, shopId: string): Promise<void> {
  await tx.select({ id: shops.id }).from(shops).where(eq(shops.id, shopId)).for('update')
}

async function countActive(tx: Tx, shopId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(hitItems)
    .where(and(eq(hitItems.shopId, shopId), ne(hitItems.status, 'archived')))
  return row?.total ?? 0
}
