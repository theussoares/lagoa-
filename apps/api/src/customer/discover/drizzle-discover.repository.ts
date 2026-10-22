import { Inject, Injectable } from '@nestjs/common'
import { and, asc, eq, exists, gt, isNull, lte, not, sql, type SQL } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { featuredPlacements, programs, shops } from '../../database/schema'
import type { CatalogShop } from '../../shops/catalog-shop'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import { DiscoverRepository, type FeaturedCatalogShop } from './discover.repository'

@Injectable()
export class DrizzleDiscoverRepository extends DiscoverRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listApprovedShops(limit: number): Promise<CatalogShop[]> {
    const rows = await this.db
      .select(CATALOG_COLUMNS)
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(eq(shops.status, 'approved'))
      .orderBy(asc(shops.name), asc(shops.id))
      .limit(limit)
    return rows.flatMap((row) => toCatalogShop(row) ?? [])
  }

  async listFeaturedShops(now: Date, day: string, limit: number): Promise<FeaturedCatalogShop[]> {
    const paidNow = exists(
      this.db
        .select({ one: sql`1` })
        .from(featuredPlacements)
        .where(
          and(
            eq(featuredPlacements.shopId, shops.id),
            eq(featuredPlacements.surface, 'discoverCarousel'),
            isNull(featuredPlacements.cancelledAt),
            lte(featuredPlacements.startsAt, now),
            gt(featuredPlacements.endsAt, now),
          ),
        ),
    )
    const paid = await this.featuredGroup(and(eq(shops.status, 'approved'), paidNow), day, limit)
    const pro = await this.featuredGroup(and(eq(shops.status, 'approved'), eq(shops.plan, 'founderPro'), not(paidNow)), day, limit)
    return [...paid.map((shop) => ({ shop, sponsored: true })), ...pro.map((shop) => ({ shop, sponsored: false }))]
  }

  /** Rotação estável por dia: a mesma ordem o dia todo, outra amanhã. */
  private async featuredGroup(where: SQL | undefined, day: string, limit: number): Promise<CatalogShop[]> {
    const rows = await this.db
      .select(CATALOG_COLUMNS)
      .from(shops)
      .innerJoin(programs, and(eq(programs.shopId, shops.id), eq(programs.active, true)))
      .where(where)
      .orderBy(sql`md5(${shops.id}::text || ${day}::text)`, asc(shops.id))
      .limit(limit)
    return rows.flatMap((row) => toCatalogShop(row) ?? [])
  }
}
