import { Inject, Injectable } from '@nestjs/common'
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lte, notInArray, or, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { featuredPlacements, hitItems, programs, shops } from '../../database/schema'
import { CATALOG_COLUMNS, type CatalogRow, toCatalogShop } from '../../shops/catalog-row'
import { CustomerHitsRepository, type HitFeedFilter, type PublicHitRecord } from './hits.repository'

const COLUMNS = {
  ...CATALOG_COLUMNS,
  itemId: hitItems.id,
  title: hitItems.title,
  description: hitItems.description,
  priceCents: hitItems.priceCents,
  photoPath: hitItems.photoPath,
  itemCtaKind: hitItems.ctaKind,
  itemWhatsapp: hitItems.whatsapp,
  itemWhatsappMessage: hitItems.whatsappMessage,
  itemCtaUrl: hitItems.ctaUrl,
  itemCtaLabel: hitItems.ctaLabel,
}

interface Row extends CatalogRow {
  readonly itemId: string
  readonly title: string
  readonly description: string | null
  readonly priceCents: number | null
  readonly photoPath: string | null
  readonly itemCtaKind: string | null
  readonly itemWhatsapp: string | null
  readonly itemWhatsappMessage: string | null
  readonly itemCtaUrl: string | null
  readonly itemCtaLabel: string | null
}

function toRecord(row: Row): PublicHitRecord | null {
  // O filtro já exige foto; um `null` aqui seria produto fora da vitrine.
  if (row.photoPath === null) return null
  return {
    id: row.itemId,
    title: row.title,
    description: row.description,
    priceCents: row.priceCents,
    photoPath: row.photoPath,
    itemContact: { ctaKind: row.itemCtaKind, whatsapp: row.itemWhatsapp, whatsappMessage: row.itemWhatsappMessage, ctaUrl: row.itemCtaUrl, ctaLabel: row.itemCtaLabel },
    shop: toCatalogShop(row),
  }
}

/** O que torna um produto visível ao cliente; a loja também precisa estar aprovada. */
function visible(now: Date): SQL | undefined {
  return and(eq(hitItems.status, 'approved'), isNotNull(hitItems.photoPath), or(isNull(hitItems.endsAt), gt(hitItems.endsAt, now)), eq(shops.status, 'approved'))
}

/** Depois do cursor em `approved_at desc nulls last, id`; a data do cursor é lida no banco (um `Date` do JS perde os microssegundos). */
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
export class DrizzleCustomerHitsRepository extends CustomerHitsRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listFeed(filter: HitFeedFilter): Promise<readonly PublicHitRecord[]> {
    const rows = await this.db
      .select(COLUMNS)
      .from(hitItems)
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(
        and(
          visible(filter.now),
          filter.categories === null ? undefined : inArray(shops.category, [...filter.categories]),
          filter.after === null ? undefined : approvedAfter(filter.after),
        ),
      )
      .orderBy(sql`${hitItems.approvedAt} desc nulls last`, asc(hitItems.id))
      .limit(filter.limit)
    return rows.flatMap((row) => toRecord(row) ?? [])
  }

  async listPaidBannerItems(now: Date, limit: number): Promise<readonly PublicHitRecord[]> {
    // Um destaque por loja (o mais antigo) antes do limite: loja com vários vigentes não come as vagas das outras.
    const oldestPerShop = this.db
      .selectDistinctOn([featuredPlacements.shopId], { id: featuredPlacements.id, startsAt: featuredPlacements.startsAt })
      .from(featuredPlacements)
      .innerJoin(hitItems, eq(hitItems.id, featuredPlacements.hitItemId))
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .where(and(eq(featuredPlacements.surface, 'hitsBanner'), isNull(featuredPlacements.cancelledAt), lte(featuredPlacements.startsAt, now), gt(featuredPlacements.endsAt, now), visible(now)))
      .orderBy(featuredPlacements.shopId, featuredPlacements.startsAt, featuredPlacements.id)
      .as('oldest_per_shop')
    const rows = await this.db
      .select(COLUMNS)
      .from(oldestPerShop)
      .innerJoin(featuredPlacements, eq(featuredPlacements.id, oldestPerShop.id))
      .innerJoin(hitItems, eq(hitItems.id, featuredPlacements.hitItemId))
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .orderBy(oldestPerShop.startsAt, oldestPerShop.id)
      .limit(limit)
    return rows.flatMap((row) => toRecord(row) ?? [])
  }

  async listProBannerItems(now: Date, excludeShopIds: readonly string[], limit: number): Promise<readonly PublicHitRecord[]> {
    const newestPerShop = this.db
      .selectDistinctOn([hitItems.shopId], { id: hitItems.id, approvedAt: hitItems.approvedAt })
      .from(hitItems)
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .where(and(visible(now), eq(shops.plan, 'founderPro'), excludeShopIds.length === 0 ? undefined : notInArray(hitItems.shopId, [...excludeShopIds])))
      .orderBy(hitItems.shopId, sql`${hitItems.approvedAt} desc nulls last`, desc(hitItems.id))
      .as('newest_per_shop')
    const rows = await this.db
      .select(COLUMNS)
      .from(newestPerShop)
      .innerJoin(hitItems, eq(hitItems.id, newestPerShop.id))
      .innerJoin(shops, eq(shops.id, hitItems.shopId))
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .orderBy(sql`${newestPerShop.approvedAt} desc nulls last`, desc(newestPerShop.id))
      .limit(limit)
    return rows.flatMap((row) => toRecord(row) ?? [])
  }
}
