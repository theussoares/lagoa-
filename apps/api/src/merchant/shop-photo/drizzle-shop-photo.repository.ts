import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { ShopPhotoKind } from '#shared/schemas/shop'
import { DB, type Database } from '../../database/database.module'
import { shops } from '../../database/schema'
import { type ShopPhotoPaths, ShopPhotoRepository } from './shop-photo.repository'

const COLUMNS = { logo: shops.logoPath, banner: shops.bannerPath } as const
const NO_PHOTOS: ShopPhotoPaths = { logo: null, banner: null }

@Injectable()
export class DrizzleShopPhotoRepository extends ShopPhotoRepository {
  constructor(@Inject(DB) private readonly db: Database) {
    super()
  }

  async findPhotoPaths(shopId: string): Promise<ShopPhotoPaths> {
    const [shop] = await this.db.select(COLUMNS).from(shops).where(eq(shops.id, shopId)).limit(1)
    return shop ?? NO_PHOTOS
  }

  async replacePhotoPath(shopId: string, kind: ShopPhotoKind, path: string): Promise<{ paths: ShopPhotoPaths; previous: string | null }> {
    // Duas trocas ao mesmo tempo: a trava faz cada uma apagar a imagem que ela de fato substituiu.
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select(COLUMNS).from(shops).where(eq(shops.id, shopId)).for('update')
      const update = kind === 'logo' ? { logoPath: path } : { bannerPath: path }
      await tx.update(shops).set(update).where(eq(shops.id, shopId))
      const before = current ?? NO_PHOTOS
      return { paths: { ...before, [kind]: path }, previous: before[kind] }
    })
  }
}
