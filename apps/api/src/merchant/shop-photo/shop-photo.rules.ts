import { SHOP_PHOTO_MAX_BYTES } from '#shared/constants/domain'
import type { ShopPhotoContentType, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'

export interface CheckedShopPhoto {
  readonly bytes: Buffer
  readonly contentType: ShopPhotoContentType
  readonly extension: 'jpg' | 'png' | 'webp'
}

const EXTENSION: Readonly<Record<ShopPhotoContentType, CheckedShopPhoto['extension']>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const startsWith = (bytes: Buffer, signature: readonly number[], offset = 0): boolean =>
  signature.every((byte, index) => bytes[offset + index] === byte)

/** Tipo real pelos primeiros bytes (assinatura do formato); o `contentType` declarado não basta. */
export function detectPhotoType(bytes: Buffer): ShopPhotoContentType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp'
  return null
}

/** Foto aceita: não vazia, até `SHOP_PHOTO_MAX_BYTES` e com os bytes do formato que diz ser. */
export function checkShopPhoto(upload: ShopPhotoUpload): Result<CheckedShopPhoto, ErrorOf<'invalidShopPhoto'>> {
  const bytes = Buffer.from(upload.dataBase64, 'base64')
  if (bytes.length === 0 || bytes.length > SHOP_PHOTO_MAX_BYTES) return err({ code: 'invalidShopPhoto' })
  if (detectPhotoType(bytes) !== upload.contentType) return err({ code: 'invalidShopPhoto' })
  return ok({ bytes, contentType: upload.contentType, extension: EXTENSION[upload.contentType] })
}
