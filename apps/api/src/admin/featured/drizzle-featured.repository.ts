import { Inject, Injectable } from '@nestjs/common'
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { FeaturedSurface } from '#shared/schemas/featured'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { adminUsers, featuredPlacements, hitItems, shops } from '../../database/schema'
import type { PlacementError, PlacementPeriod } from '../../featured/featured.rules'
import {
  type AdminPlacementRecord,
  AdminFeaturedRepository,
  type CancelPlacementError,
  type CreatePlacementError,
  type PlacementCandidate,
  type PlacementSnapshot,
  type PlacementWindow,
} from './featured.repository'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type Reader = Database | Tx

const creator = alias(adminUsers, 'creator')
const canceller = alias(adminUsers, 'canceller')

const COLUMNS = {
  id: featuredPlacements.id,
  surface: featuredPlacements.surface,
  shopId: shops.id,
  shopName: shops.name,
  hitItemId: hitItems.id,
  hitItemTitle: hitItems.title,
  startsAt: featuredPlacements.startsAt,
  endsAt: featuredPlacements.endsAt,
  note: featuredPlacements.note,
  createdByName: creator.name,
  createdAt: featuredPlacements.createdAt,
  cancelledAt: featuredPlacements.cancelledAt,
  cancelledByName: canceller.name,
}

interface Row {
  readonly id: string
  readonly surface: FeaturedSurface
  readonly shopId: string
  readonly shopName: string
  readonly hitItemId: string | null
  readonly hitItemTitle: string | null
  readonly startsAt: Date
  readonly endsAt: Date
  readonly note: string | null
  readonly createdByName: string
  readonly createdAt: Date
  readonly cancelledAt: Date | null
  readonly cancelledByName: string | null
}

function toRecord(row: Row): AdminPlacementRecord {
  return {
    id: row.id,
    surface: row.surface,
    shop: { id: row.shopId, name: row.shopName },
    hitItem: row.hitItemId === null || row.hitItemTitle === null ? null : { id: row.hitItemId, title: row.hitItemTitle },
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    note: row.note,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
    cancelledByName: row.cancelledByName,
  }
}

/** Semiaberto: toca a janela quem começa antes do fim dela e termina depois do começo. */
const touches = (window: PlacementWindow) =>
  and(eq(featuredPlacements.surface, window.surface), lt(featuredPlacements.startsAt, window.to), gt(featuredPlacements.endsAt, window.from))

function selectRecords(reader: Reader) {
  return reader
    .select(COLUMNS)
    .from(featuredPlacements)
    .innerJoin(shops, eq(shops.id, featuredPlacements.shopId))
    .innerJoin(creator, eq(creator.id, featuredPlacements.createdByAdminId))
    .leftJoin(hitItems, eq(hitItems.id, featuredPlacements.hitItemId))
    .leftJoin(canceller, eq(canceller.id, featuredPlacements.cancelledByAdminId))
}

async function findRecord(reader: Reader, id: string): Promise<AdminPlacementRecord | null> {
  const [row] = await selectRecords(reader).where(eq(featuredPlacements.id, id)).limit(1)
  return row ? toRecord(row) : null
}

async function activePeriodsIn(reader: Reader, window: PlacementWindow): Promise<PlacementPeriod[]> {
  return reader
    .select({ startsAt: featuredPlacements.startsAt, endsAt: featuredPlacements.endsAt })
    .from(featuredPlacements)
    .where(and(touches(window), isNull(featuredPlacements.cancelledAt)))
}

@Injectable()
export class DrizzleAdminFeaturedRepository extends AdminFeaturedRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async list(window: PlacementWindow, limit: number): Promise<readonly AdminPlacementRecord[]> {
    const rows = await selectRecords(this.db)
      .where(touches(window))
      .orderBy(featuredPlacements.startsAt, featuredPlacements.id)
      .limit(limit)
    return rows.map(toRecord)
  }

  async listProShops(limit: number): Promise<readonly { readonly id: string; readonly name: string }[]> {
    return this.db
      .select({ id: shops.id, name: shops.name })
      .from(shops)
      .where(and(eq(shops.plan, 'founderPro'), eq(shops.status, 'approved')))
      .orderBy(shops.name, shops.id)
      .limit(limit)
  }

  async activePeriods(window: PlacementWindow): Promise<readonly PlacementPeriod[]> {
    return activePeriodsIn(this.db, window)
  }

  async create(
    candidate: PlacementCandidate,
    adminId: string,
    decide: (snapshot: PlacementSnapshot) => Result<void, PlacementError>,
  ): Promise<Result<AdminPlacementRecord, CreatePlacementError>> {
    return this.db.transaction(async (tx) => {
      // Um lock por vitrine, antes de ler os vigentes: duas criações para a última vaga viram fila, e a segunda já vê a primeira.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('featured:' || ${candidate.surface}::text))`)
      const [shop] = await tx.select({ status: shops.status }).from(shops).where(eq(shops.id, candidate.shopId))
      if (!shop) return err({ code: 'notFound', entity: 'shop' })
      const [hitItem] =
        candidate.hitItemId === null
          ? []
          : await tx.select({ status: hitItems.status, shopId: hitItems.shopId }).from(hitItems).where(eq(hitItems.id, candidate.hitItemId))
      const existing = await activePeriodsIn(tx, { surface: candidate.surface, from: candidate.startsAt, to: candidate.endsAt })
      const decision = decide({ shopStatus: shop.status, hitItem: hitItem ?? null, existing })
      if (!decision.ok) return decision
      const [inserted] = await tx
        .insert(featuredPlacements)
        .values({ ...candidate, createdByAdminId: adminId })
        .returning({ id: featuredPlacements.id })
      if (!inserted) throw new Error('featured placement insert returned nothing')
      const saved = await findRecord(tx, inserted.id)
      if (!saved) throw new Error('created featured placement vanished')
      return ok(saved)
    })
  }

  async cancel(id: string, adminId: string): Promise<Result<AdminPlacementRecord, CancelPlacementError>> {
    const [cancelled] = await this.db
      .update(featuredPlacements)
      .set({ cancelledAt: new Date(), cancelledByAdminId: adminId })
      .where(and(eq(featuredPlacements.id, id), isNull(featuredPlacements.cancelledAt)))
      .returning({ id: featuredPlacements.id })
    const record = await findRecord(this.db, id)
    if (!record) return err({ code: 'notFound', entity: 'featuredPlacement' })
    return cancelled ? ok(record) : err({ code: 'invalidTransition' })
  }
}
