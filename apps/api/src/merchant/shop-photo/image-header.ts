import type { ShopPhotoContentType } from '#shared/schemas/shop'

export interface ImageSize {
  readonly width: number
  readonly height: number
}

const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
/** Marcadores JPEG sem campo de tamanho (RSTn, SOI, EOI, TEM). */
const JPEG_STANDALONE_MARKERS = new Set([0x01, 0xd0, 0xd1, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9])

const ascii = (bytes: Buffer, offset: number, length: number): string => bytes.toString('latin1', offset, offset + length)

function pngSize(bytes: Buffer): ImageSize | null {
  // Assinatura (8) + tamanho do chunk (4) + "IHDR" (4) + largura (4) + altura (4).
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== 'IHDR') return null
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function jpegSize(bytes: Buffer): ImageSize | null {
  let offset = 2
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null
    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xff) {
      offset += 1
      continue
    }
    if (JPEG_STANDALONE_MARKERS.has(marker)) {
      offset += 2
      continue
    }
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (offset + 9 > bytes.length) return null
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) }
    }
    offset += 2 + bytes.readUInt16BE(offset + 2)
  }
  return null
}

function webpSize(bytes: Buffer): ImageSize | null {
  if (bytes.length < 30) return null
  const chunk = ascii(bytes, 12, 4)
  if (chunk === 'VP8 ') return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff }
  if (chunk === 'VP8X') return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) }
  if (chunk === 'VP8L') {
    const [b0, b1, b2, b3] = [bytes[21] ?? 0, bytes[22] ?? 0, bytes[23] ?? 0, bytes[24] ?? 0]
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) }
  }
  return null
}

/** Largura e altura lidas do cabeçalho, sem decodificar a imagem; `null` quando o cabeçalho não é legível. */
export function readImageSize(bytes: Buffer, type: ShopPhotoContentType): ImageSize | null {
  if (type === 'image/png') return pngSize(bytes)
  if (type === 'image/jpeg') return jpegSize(bytes)
  return webpSize(bytes)
}
