import { SHOP_PHOTO_MAX_BYTES, SHOP_PHOTO_MAX_DIMENSION } from '#shared/constants/domain'
import type { ShopPhotoContentType, ShopPhotoUpload } from '#shared/schemas/shop'
import type { ErrorOf } from '#shared/types/errors'
import { err, ok, type Result } from '#shared/types/result'
import { readImageSize } from './image-header'

/**
 * Maior lado aceito no servidor. O app já manda no máximo `SHOP_PHOTO_MAX_DIMENSION`; a folga cobre outro cliente, e o
 * teto barra a imagem pequena em bytes que declara milhares de pixels e trava o celular de quem abre o Descobrir.
 */
const SERVER_MAX_DIMENSION = 2 * SHOP_PHOTO_MAX_DIMENSION

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

/** Foto aceita: não vazia, até `SHOP_PHOTO_MAX_BYTES`, com os bytes do formato que diz ser e tamanho legível dentro do teto. */
export function checkShopPhoto(upload: ShopPhotoUpload): Result<CheckedShopPhoto, ErrorOf<'invalidShopPhoto'>> {
  const bytes = Buffer.from(upload.dataBase64, 'base64')
  if (bytes.length === 0 || bytes.length > SHOP_PHOTO_MAX_BYTES) return err({ code: 'invalidShopPhoto' })
  if (detectPhotoType(bytes) !== upload.contentType) return err({ code: 'invalidShopPhoto' })
  const size = readImageSize(bytes, upload.contentType)
  if (size === null || size.width < 1 || size.height < 1) return err({ code: 'invalidShopPhoto' })
  if (size.width > SERVER_MAX_DIMENSION || size.height > SERVER_MAX_DIMENSION) return err({ code: 'invalidShopPhoto' })
  return ok({ bytes, contentType: upload.contentType, extension: EXTENSION[upload.contentType] })
}
