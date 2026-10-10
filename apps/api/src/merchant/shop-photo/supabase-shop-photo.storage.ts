import { Inject, Injectable, Logger } from '@nestjs/common'
import { ENV } from '../../config/config.module'
import type { Env } from '../../config/env'
import { SHOP_ASSETS_BUCKET } from '../../storage/shop-assets'
import { ShopPhotoStorage } from './shop-photo.storage'

const STORAGE_TIMEOUT_MS = 15_000

/** Storage do Supabase pela API REST, com a service role (só o servidor escreve no bucket). */
@Injectable()
export class SupabaseShopPhotoStorage extends ShopPhotoStorage {
  private readonly logger = new Logger(SupabaseShopPhotoStorage.name)

  constructor(@Inject(ENV) private readonly env: Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>) {
    super()
  }

  private objectUrl(path: string): string {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/')
    return `${this.env.SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/${SHOP_ASSETS_BUCKET}/${encodedPath}`
  }

  async upload(path: string, bytes: Buffer, contentType: string): Promise<boolean> {
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY
    if (key === undefined) {
      this.logger.error('SUPABASE_SERVICE_ROLE_KEY is not set: shop photo upload is off')
      return false
    }
    try {
      const response = await fetch(this.objectUrl(path), {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, apikey: key, 'content-type': contentType, 'cache-control': 'max-age=31536000' },
        body: new Uint8Array(bytes),
        signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
      })
      if (!response.ok) this.logger.error(`Shop photo upload failed with status ${response.status}`)
      return response.ok
    } catch {
      this.logger.error('Shop photo upload failed (network)')
      return false
    }
  }

  async remove(path: string): Promise<void> {
    const key = this.env.SUPABASE_SERVICE_ROLE_KEY
    if (key === undefined) return
    await fetch(this.objectUrl(path), {
      method: 'DELETE',
      headers: { authorization: `Bearer ${key}`, apikey: key },
      signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS),
    }).catch(() => undefined)
  }
}
