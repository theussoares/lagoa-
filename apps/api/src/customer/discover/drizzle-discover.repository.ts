import { Inject, Injectable } from '@nestjs/common'
import { asc, eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { programs, shops } from '../../database/schema'
import type { CatalogShop } from '../../shops/catalog-shop'
import { CATALOG_COLUMNS, toCatalogShop } from '../../shops/catalog-row'
import { DiscoverRepository } from './discover.repository'

@Injectable()
export class DrizzleDiscoverRepository extends DiscoverRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async listApprovedShops(limit: number): Promise<CatalogShop[]> {
    const rows = await this.db
      .select(CATALOG_COLUMNS)
      .from(shops)
      .innerJoin(programs, eq(programs.shopId, shops.id))
      .where(eq(shops.status, 'approved'))
      .orderBy(asc(shops.name), asc(shops.id))
      .limit(limit)
    return rows.flatMap((row) => toCatalogShop(row) ?? [])
  }
}
