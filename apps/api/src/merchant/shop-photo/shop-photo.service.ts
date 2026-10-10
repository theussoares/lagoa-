import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { ShopPhotoKind, ShopPhotos, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { shopAssetUrl } from '../../storage/shop-assets'
import { checkShopPhoto } from './shop-photo.rules'
import { type ShopPhotoPaths, ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoStorage } from './shop-photo.storage'

/** Logo e banner da vitrine do Descobrir: valida, guarda no bucket com nome novo (sem cache velho) e troca o caminho. */
@Injectable()
export class ShopPhotoService {
  constructor(
    private readonly photos: ShopPhotoRepository,
    private readonly storage: ShopPhotoStorage,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
  ) {}

  private toPhotos(paths: ShopPhotoPaths): ShopPhotos {
    const url = (path: string | null): string | null => (path === null ? null : shopAssetUrl(this.env.SUPABASE_URL, path))
    return { logoUrl: url(paths.logo), bannerUrl: url(paths.banner) }
  }

  async current(shopId: string): Promise<ShopPhotos> {
    return this.toPhotos(await this.photos.findPhotoPaths(shopId))
  }

  async replace(shopId: string, kind: ShopPhotoKind, upload: ShopPhotoUpload): Promise<Result<ShopPhotos, ErrorOf<'invalidShopPhoto' | 'internal'>>> {
    const photo = checkShopPhoto(upload)
    if (!photo.ok) return photo
    const path = `${shopId}/${kind}-${uuidv7()}.${photo.value.extension}`
    if (!(await this.storage.upload(path, photo.value.bytes, photo.value.contentType))) return err({ code: 'internal' })
    const { paths, previous } = await this.photos.replacePhotoPath(shopId, kind, path)
    if (previous !== null && previous !== path) await this.storage.remove(previous)
    return ok(this.toPhotos(paths))
  }
}
