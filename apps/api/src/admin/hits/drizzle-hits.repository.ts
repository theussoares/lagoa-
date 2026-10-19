import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNotNull, sql, type SQL } from 'drizzle-orm'
import type { HitItemStatus } from '#shared/schemas/hitItem'
import type { ShopStatus } from '#shared/schemas/shop'
import { err, ok, type Result } from '#shared/types/result'
import { DB, type Database } from '../../database/database.module'
import { hitItemStatusEvents, hitItems, shops } from '../../database/schema'
import {
  type AdminHitItemListFilter,
  type AdminHitItemRecord,
  AdminHitsRepository,
  type HitItemDecision,
  type HitItemSnapshot,
  type ReviewError,
} from './hits.repository'

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
type Reader = Database | Tx

const COLUMNS = {
  id: hitItems.id,
  version: hitItems.version,
  title: hitItems.title,
  description: hitItems.description,
  priceCents: hitItems.priceCents,
  endsAt: hitItems.endsAt,
  status: hitItems.status,
  rejectionReason: hitItems.rejectionReason,
  photoPath: hitItems.photoPath,
  createdAt: hitItems.createdAt,
  approvedAt: hitItems.approvedAt,
  ctaKind: hitItems.ctaKind,
  whatsapp: hitItems.whatsapp,
  whatsappMessage: hitItems.whatsappMessage,
  ctaUrl: hitItems.ctaUrl,
  ctaLabel: hitItems.ctaLabel,
  shopId: shops.id,
  shopName: shops.name,
  shopStatus: shops.status,
  shopCtaKind: shops.ctaKind,
  shopWhatsapp: shops.whatsapp,
  shopWhatsappMessage: shops.whatsappMessage,
  shopCtaUrl: shops.ctaUrl,
  shopCtaLabel: shops.ctaLabel,
}

interface Row {
  readonly id: string
  readonly version: number
  readonly title: string
  readonly description: string | null
  readonly priceCents: number | null
  readonly endsAt: Date | null
  readonly status: HitItemStatus
  readonly rejectionReason: string | null
  readonly photoPath: string | null
  readonly createdAt: Date
  readonly approvedAt: Date | null
  readonly ctaKind: string | null
  readonly whatsapp: string | null
  readonly whatsappMessage: string | null
  readonly ctaUrl: string | null
  readonly ctaLabel: string | null
  readonly shopId: string
  readonly shopName: string
  readonly shopStatus: ShopStatus
  readonly shopCtaKind: string | null
  readonly shopWhatsapp: string | null
  readonly shopWhatsappMessage: string | null
  readonly shopCtaUrl: string | null
  readonly shopCtaLabel: string | null
}

function toRecord(row: Row): AdminHitItemRecord {
  return {
    id: row.id,
    version: row.version,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    endsAt: row.endsAt,
    status: row.status,
    rejectionReason: row.rejectionReason,
    photoPath: row.photoPath,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    itemContact: { ctaKind: row.ctaKind, whatsapp: row.whatsapp, whatsappMessage: row.whatsappMessage, ctaUrl: row.ctaUrl, ctaLabel: row.ctaLabel },
    shop: {
      id: row.shopId,
      name: row.shopName,
      status: row.shopStatus,
      contact: {
        ctaKind: row.shopCtaKind,
        whatsapp: row.shopWhatsapp,
        whatsappMessage: row.shopWhatsappMessage,
        ctaUrl: row.shopCtaUrl,
        ctaLabel: row.shopCtaLabel,
      },
    },
  }
}

/** Depois do cursor na fila: `created_at` e `id` do produto do cursor são lidos do banco (um `Date` do JS perde os microssegundos). */
function pendingAfter(id: string): SQL {
  return sql`exists (
    select 1 from ${hitItems} as cursor_item
    where cursor_item.id = ${id}
      and (${hitItems.createdAt} > cursor_item.created_at or (${hitItems.createdAt} = cursor_item.created_at and ${hitItems.id} > cursor_item.id))
  )`
}

/** Depois do cursor na vitrine (`approved_at desc nulls last, id`): sem data vem por último. */
function approvedAfter(id: string): SQL {
  return sql`exists (
    select 1 from ${hitItems} as cursor_item
    where cursor_item.id = ${id}
      and (
        (cursor_item.approved_at is not null and (
          ${hitItems.approvedAt} is null
          or ${hitItems.approvedAt} < cursor_item.approved_at
          or (${hitItems.approvedAt} = cursor_item.approved_at and ${hitItems.id} > cursor_item.id)
        ))
        or (cursor_item.approved_at is null and ${hitItems.approvedAt} is null and ${hitItems.id} > cursor_item.id)
      )
  )`
}

@Injectable()
export class DrizzleAdminHitsRepository extends AdminHitsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async list(filter: AdminHitItemListFilter): Promise<readonly AdminHitItemRecord[]> {
    const pending = filter.tab === 'pending'
    const rows = await this.db
      .select(COLUMNS)
      .from(hitItems)
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .where(
        and(
          eq(hitItems.status, filter.tab),
          filter.shopId === undefined ? undefined : eq(hitItems.shopId, filter.shopId),
          pending ? isNotNull(hitItems.photoPath) : undefined,
          filter.after === null ? undefined : pending ? pendingAfter(filter.after) : approvedAfter(filter.after),
        ),
      )
      .orderBy(...(pending ? [sql`${hitItems.createdAt} asc`, sql`${hitItems.id} asc`] : [sql`${hitItems.approvedAt} desc nulls last`, sql`${hitItems.id} asc`]))
      .limit(filter.limit)
    return rows.map(toRecord)
  }

  async review(
    id: string,
    adminId: string,
    decide: (current: HitItemSnapshot) => Result<HitItemDecision, ReviewError>,
  ): Promise<Result<AdminHitItemRecord, ReviewError>> {
    return this.db.transaction(async (tx) => {
      // Só a linha do item: o lojista trava loja e depois item, então travar a loja aqui depois do item cruzaria as ordens.
      const [current] = await tx
        .select({ status: hitItems.status, version: hitItems.version, photoPath: hitItems.photoPath })
        .from(hitItems)
        .where(eq(hitItems.id, id))
        .for('update')
      if (!current) return err({ code: 'notFound', entity: 'hitItem' })
      const decision = decide(current)
      if (!decision.ok) return decision
      const now = new Date()
      await tx
        .update(hitItems)
        .set({
          status: decision.value.to,
          rejectionReason: decision.value.reason,
          updatedAt: now,
          ...(decision.value.to === 'approved' && { approvedAt: now }),
        })
        .where(eq(hitItems.id, id))
      await tx.insert(hitItemStatusEvents).values({
        hitItemId: id,
        fromStatus: current.status,
        toStatus: decision.value.to,
        actorAdminId: adminId,
        reason: decision.value.reason,
      })
      const saved = await findRecord(tx, id)
      if (!saved) throw new Error('reviewed hit item vanished')
      return ok(saved)
    })
  }
}

async function findRecord(reader: Reader, id: string): Promise<AdminHitItemRecord | null> {
  const [row] = await reader
    .select(COLUMNS)
    .from(hitItems)
    .innerJoin(shops, eq(shops.id, hitItems.shopId))
    .where(eq(hitItems.id, id))
    .limit(1)
  return row ? toRecord(row) : null
}
