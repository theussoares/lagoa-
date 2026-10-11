import { describe, expect, it } from 'vitest'
import type { ShopPhotoKind } from '#shared/schemas/shop'
import { pngHeader } from './image-fixtures'
import { type ShopPhotoPaths, ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoService } from './shop-photo.service'
import { ShopPhotoStorage } from './shop-photo.storage'

const SHOP_ID = '018f98a2-7b2a-7182-9f33-6d004bbbb002'
const PNG = pngHeader(1200, 800).toString('base64')
const env = { SUPABASE_URL: 'https://project.supabase.co' }
const publicUrl = (path: string): string => `https://project.supabase.co/storage/v1/object/public/shop-assets/${path}`

class MemoryPhotos extends ShopPhotoRepository {
  constructor(public paths: { logo: string | null; banner: string | null } = { logo: null, banner: null }) {
    super()
  }
  async findPhotoPaths(): Promise<ShopPhotoPaths> {
    return this.paths
  }
  async replacePhotoPath(_shopId: string, kind: ShopPhotoKind, path: string) {
    const previous = this.paths[kind]
    this.paths = { ...this.paths, [kind]: path }
    return { paths: this.paths, previous }
  }
}

class MemoryStorage extends ShopPhotoStorage {
  uploaded: string[] = []
  removed: string[] = []
  constructor(private readonly works = true) {
    super()
  }
  async upload(path: string): Promise<boolean> {
    if (this.works) this.uploaded.push(path)
    return this.works
  }
  async remove(path: string): Promise<void> {
    this.removed.push(path)
  }
}

describe('ShopPhotoService', () => {
  it('stores a new banner under the shop, keeps the logo, removes the old banner and returns both URLs', async () => {
    const photos = new MemoryPhotos({ logo: `${SHOP_ID}/logo-a.png`, banner: `${SHOP_ID}/old.png` })
    const storage = new MemoryStorage()
    const result = await new ShopPhotoService(photos, storage, env).replace(SHOP_ID, 'banner', { contentType: 'image/png', dataBase64: PNG })
    expect(storage.uploaded[0]).toMatch(new RegExp(`^${SHOP_ID}/banner-[0-9a-f-]+\\.png$`))
    expect(storage.removed).toEqual([`${SHOP_ID}/old.png`])
    expect(result).toEqual({ ok: true, value: { logoUrl: publicUrl(`${SHOP_ID}/logo-a.png`), bannerUrl: publicUrl(photos.paths.banner ?? '') } })
  })

  it('stores the logo apart from the banner', async () => {
    const photos = new MemoryPhotos()
    const storage = new MemoryStorage()
    await new ShopPhotoService(photos, storage, env).replace(SHOP_ID, 'logo', { contentType: 'image/png', dataBase64: PNG })
    expect(photos.paths.logo).toMatch(new RegExp(`^${SHOP_ID}/logo-`))
    expect(photos.paths.banner).toBeNull()
    expect(storage.removed).toEqual([])
  })

  it('keeps the current image when the upload fails', async () => {
    const photos = new MemoryPhotos({ logo: null, banner: `${SHOP_ID}/old.png` })
    const result = await new ShopPhotoService(photos, new MemoryStorage(false), env).replace(SHOP_ID, 'banner', { contentType: 'image/png', dataBase64: PNG })
    expect(result).toEqual({ ok: false, error: { code: 'internal' } })
    expect(photos.paths.banner).toBe(`${SHOP_ID}/old.png`)
  })

  it('refuses an invalid image before touching the bucket', async () => {
    const storage = new MemoryStorage()
    const result = await new ShopPhotoService(new MemoryPhotos(), storage, env).replace(SHOP_ID, 'logo', { contentType: 'image/jpeg', dataBase64: PNG })
    expect(result).toEqual({ ok: false, error: { code: 'invalidShopPhoto' } })
    expect(storage.uploaded).toEqual([])
  })

  it('says null for images the shop does not have', async () => {
    expect(await new ShopPhotoService(new MemoryPhotos(), new MemoryStorage(), env).current(SHOP_ID)).toEqual({ logoUrl: null, bannerUrl: null })
  })
})
