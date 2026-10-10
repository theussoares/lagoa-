import { describe, expect, it } from 'vitest'
import { SHOP_PHOTO_MAX_BYTES } from '#shared/constants/domain'
import { checkShopPhoto, detectPhotoType } from './shop-photo.rules'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
const WEBP = Buffer.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0])
const b64 = (bytes: Buffer): string => bytes.toString('base64')

describe('detectPhotoType', () => {
  it('reads the format from the first bytes', () => {
    expect(detectPhotoType(PNG)).toBe('image/png')
    expect(detectPhotoType(JPEG)).toBe('image/jpeg')
    expect(detectPhotoType(WEBP)).toBe('image/webp')
    expect(detectPhotoType(Buffer.from('<svg onload=alert(1)>'))).toBeNull()
  })
})

describe('checkShopPhoto', () => {
  it('accepts a real image of the declared type and picks the extension', () => {
    expect(checkShopPhoto({ contentType: 'image/webp', dataBase64: b64(WEBP) })).toMatchObject({ ok: true, value: { extension: 'webp' } })
  })

  it('refuses bytes that do not match the declared type', () => {
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(JPEG) })).toEqual({ ok: false, error: { code: 'invalidShopPhoto' } })
  })

  it('refuses an empty or oversized file', () => {
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: '' }).ok).toBe(false)
    const big = Buffer.concat([PNG, Buffer.alloc(SHOP_PHOTO_MAX_BYTES)])
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(big) }).ok).toBe(false)
  })
})
