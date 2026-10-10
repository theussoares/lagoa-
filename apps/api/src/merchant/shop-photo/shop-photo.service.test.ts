import { describe, expect, it } from 'vitest'
import { ShopPhotoRepository } from './shop-photo.repository'
import { ShopPhotoService } from './shop-photo.service'
import { ShopPhotoStorage } from './shop-photo.storage'

const SHOP_ID = '018f98a2-7b2a-7182-9f33-6d004bbbb002'
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]).toString('base64')
const env = { SUPABASE_URL: 'https://project.supabase.co' }

class MemoryPhotos extends ShopPhotoRepository {
  constructor(public path: string | null = null) {
    super()
  }
  async findPhotoPath(): Promise<string | null> {
    return this.path
  }
  async replacePhotoPath(_shopId: string, path: string): Promise<string | null> {
    const previous = this.path
    this.path = path
    return previous
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
  it('stores a new file under the shop, saves the path, removes the old file and returns the public URL', async () => {
    const photos = new MemoryPhotos(`${SHOP_ID}/old.png`)
    const storage = new MemoryStorage()
    const result = await new ShopPhotoService(photos, storage, env).replace(SHOP_ID, { contentType: 'image/png', dataBase64: PNG })
    expect(result.ok).toBe(true)
    expect(storage.uploaded).toHaveLength(1)
    expect(storage.uploaded[0]).toMatch(new RegExp(`^${SHOP_ID}/[0-9a-f-]+\\.png$`))
    expect(photos.path).toBe(storage.uploaded[0])
    expect(storage.removed).toEqual([`${SHOP_ID}/old.png`])
    if (result.ok) expect(result.value.imageUrl).toBe(`https://project.supabase.co/storage/v1/object/public/shop-assets/${photos.path}`)
  })

  it('keeps the current photo when the upload fails', async () => {
    const photos = new MemoryPhotos(`${SHOP_ID}/old.png`)
    const result = await new ShopPhotoService(photos, new MemoryStorage(false), env).replace(SHOP_ID, { contentType: 'image/png', dataBase64: PNG })
    expect(result).toEqual({ ok: false, error: { code: 'internal' } })
    expect(photos.path).toBe(`${SHOP_ID}/old.png`)
  })

  it('refuses an invalid photo before touching the bucket', async () => {
    const storage = new MemoryStorage()
    const result = await new ShopPhotoService(new MemoryPhotos(), storage, env).replace(SHOP_ID, { contentType: 'image/jpeg', dataBase64: PNG })
    expect(result).toEqual({ ok: false, error: { code: 'invalidShopPhoto' } })
    expect(storage.uploaded).toEqual([])
  })

  it('says null when the shop has no photo', async () => {
    expect(await new ShopPhotoService(new MemoryPhotos(), new MemoryStorage(), env).current(SHOP_ID)).toEqual({ imageUrl: null })
  })
})
