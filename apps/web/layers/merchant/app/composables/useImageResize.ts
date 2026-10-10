import { SHOP_LOGO_DIMENSION, SHOP_PHOTO_MAX_BYTES, SHOP_PHOTO_MAX_DIMENSION } from '#shared/constants/domain'
import type { ShopPhotoContentType, ShopPhotoKind, ShopPhotoUpload } from '#shared/schemas/shop'

/** Qualidades tentadas em ordem até a foto caber em `SHOP_PHOTO_MAX_BYTES`. */
const QUALITY_STEPS = [0.85, 0.7, 0.55] as const
const BASE64_CHUNK = 0x8000

function toBlob(canvas: HTMLCanvasElement, type: ShopPhotoContentType, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) binary += String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK))
  return btoa(binary)
}

interface Crop {
  readonly sx: number
  readonly sy: number
  readonly size: { readonly width: number; readonly height: number }
  readonly width: number
  readonly height: number
}

/** Banner: proporção original, lado maior até 1200 px. Logo: quadrado recortado no centro, 512 px. */
function cropFor(kind: ShopPhotoKind, width: number, height: number): Crop {
  if (kind === 'logo') {
    const side = Math.min(width, height)
    const target = Math.min(SHOP_LOGO_DIMENSION, side)
    return { sx: (width - side) / 2, sy: (height - side) / 2, size: { width: side, height: side }, width: target, height: target }
  }
  const scale = Math.min(1, SHOP_PHOTO_MAX_DIMENSION / Math.max(width, height))
  return { sx: 0, sy: 0, size: { width, height }, width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Reduz a imagem no navegador antes de enviar (`cropFor`) e grava em WebP (JPEG onde o navegador não gera WebP).
 * Foto de celular tem vários MB; reduzida fica em dezenas ou centenas de kB. `null` quando não dá para ler.
 */
export function useImageResize(): { toPhotoUpload: (file: File, kind: ShopPhotoKind) => Promise<ShopPhotoUpload | null> } {
  async function toPhotoUpload(file: File, kind: ShopPhotoKind): Promise<ShopPhotoUpload | null> {
    if (!import.meta.client) return null
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (bitmap === null) return null
    const crop = cropFor(kind, bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = crop.width
    canvas.height = crop.height
    const context = canvas.getContext('2d')
    if (context === null) {
      bitmap.close()
      return null
    }
    // Fundo branco: PNG transparente que vira JPEG ficaria com fundo preto.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, crop.sx, crop.sy, crop.size.width, crop.size.height, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    for (const quality of QUALITY_STEPS) {
      const webp = await toBlob(canvas, 'image/webp', quality)
      // Navegador sem WebP devolve PNG: aí vai JPEG.
      const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg', quality)
      if (blob === null) return null
      if (blob.size <= SHOP_PHOTO_MAX_BYTES) {
        const contentType: ShopPhotoContentType = blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
        return { contentType, dataBase64: await toBase64(blob) }
      }
    }
    return null
  }

  return { toPhotoUpload }
}
