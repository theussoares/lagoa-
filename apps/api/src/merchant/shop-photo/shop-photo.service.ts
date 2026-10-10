import { Inject, Injectable } from '@nestjs/common'
import { uuidv7 } from 'uuidv7'
import type { ShopPhoto, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { shopAssetUrl } from '../../storage/shop-assets'
import { checkShopPhoto } from './shop-photo.rules'
import { ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoStorage } from './shop-photo.storage'

/** Foto da vitrine do Descobrir: valida, guarda no bucket com nome novo (sem cache velho) e troca o caminho da loja. */
@Injectable()
export class ShopPhotoService {
  constructor(
    private readonly photos: ShopPhotoRepository,
    private readonly storage: ShopPhotoStorage,
    @Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL'>,
  ) {}

  private toPhoto(path: string | null): ShopPhoto {
    return { imageUrl: path === null ? null : shopAssetUrl(this.env.SUPABASE_URL, path) }
  }

  async current(shopId: string): Promise<ShopPhoto> {
    return this.toPhoto(await this.photos.findPhotoPath(shopId))
  }

  async replace(shopId: string, upload: ShopPhotoUpload): Promise<Result<ShopPhoto, ErrorOf<'invalidShopPhoto' | 'internal'>>> {
    const photo = checkShopPhoto(upload)
    if (!photo.ok) return photo
    const path = `${shopId}/${uuidv7()}.${photo.value.extension}`
    if (!(await this.storage.upload(path, photo.value.bytes, photo.value.contentType))) return err({ code: 'internal' })
    const previous = await this.photos.replacePhotoPath(shopId, path)
    if (previous !== null && previous !== path) await this.storage.remove(previous)
    return ok(this.toPhoto(path))
  }
}
