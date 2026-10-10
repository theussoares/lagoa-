import { describe, expect, it } from 'vitest'
import { SHOP_PHOTO_MAX_BYTES } from '#shared/constants/domain'
import { readImageSize } from './image-header'
import { jpegHeader, pngHeader, webpHeader } from './image-fixtures'
import { checkShopPhoto, detectPhotoType } from './shop-photo.rules'

const b64 = (bytes: Buffer): string => bytes.toString('base64')

describe('detectPhotoType', () => {
  it('reads the format from the first bytes', () => {
    expect(detectPhotoType(pngHeader(10, 10))).toBe('image/png')
    expect(detectPhotoType(jpegHeader(10, 10))).toBe('image/jpeg')
    expect(detectPhotoType(webpHeader(10, 10))).toBe('image/webp')
    expect(detectPhotoType(Buffer.from('<svg onload=alert(1)>'))).toBeNull()
  })
})

describe('readImageSize', () => {
  it('reads width and height from PNG, JPEG and WebP headers', () => {
    expect(readImageSize(pngHeader(1200, 800), 'image/png')).toEqual({ width: 1200, height: 800 })
    expect(readImageSize(jpegHeader(1200, 675), 'image/jpeg')).toEqual({ width: 1200, height: 675 })
    expect(readImageSize(webpHeader(1200, 900), 'image/webp')).toEqual({ width: 1200, height: 900 })
  })

  it('gives up on a truncated header', () => {
    expect(readImageSize(pngHeader(10, 10).subarray(0, 12), 'image/png')).toBeNull()
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0x00]), 'image/jpeg')).toBeNull()
  })
})

describe('checkShopPhoto', () => {
  it('accepts a real image of the declared type and picks the extension', () => {
    expect(checkShopPhoto({ contentType: 'image/webp', dataBase64: b64(webpHeader(1200, 800)) })).toMatchObject({ ok: true, value: { extension: 'webp' } })
  })

  it('refuses bytes that do not match the declared type', () => {
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(jpegHeader(10, 10)) })).toEqual({ ok: false, error: { code: 'invalidShopPhoto' } })
  })

  it('refuses an empty or oversized file', () => {
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: '' }).ok).toBe(false)
    const big = Buffer.concat([pngHeader(100, 100), Buffer.alloc(SHOP_PHOTO_MAX_BYTES)])
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(big) }).ok).toBe(false)
  })

  it('refuses a small file that declares a huge image (decompression bomb)', () => {
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(pngHeader(30000, 30000)) }).ok).toBe(false)
    expect(checkShopPhoto({ contentType: 'image/png', dataBase64: b64(pngHeader(2400, 1600)) }).ok).toBe(true)
  })
})
