import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { ShopPhotoRepository } from './shop-photo.repository'

@Injectable()
export class DrizzleShopPhotoRepository extends ShopPhotoRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findPhotoPath(shopId: string): Promise<string | null> {
    const [shop] = await this.db.select({ path: shops.logoPath }).from(shops).where(eq(shops.id, shopId)).limit(1)
    return shop?.path ?? null
  }

  async replacePhotoPath(shopId: string, path: string): Promise<string | null> {
    // Duas trocas ao mesmo tempo: a trava faz cada uma apagar a foto que ela de fato substituiu.
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select({ path: shops.logoPath }).from(shops).where(eq(shops.id, shopId)).for('update')
      await tx.update(shops).set({ logoPath: path }).where(eq(shops.id, shopId))
      return current?.path ?? null
    })
  }
}
