import { SHOP_PHOTO_MAX_BYTES, SHOP_PHOTO_MAX_DIMENSION } from '#shared/constants/domain'
import type { ShopPhotoContentType, ShopPhotoUpload } from '#shared/schemas/shop'

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

/**
 * Reduz a foto no navegador antes de enviar: lado maior em `SHOP_PHOTO_MAX_DIMENSION` e WebP (JPEG onde o navegador
 * não gera WebP). Foto de celular tem vários MB; reduzida fica em centenas de kB. `null` quando não dá para ler.
 */
export function useImageResize(): { toPhotoUpload: (file: File) => Promise<ShopPhotoUpload | null> } {
  async function toPhotoUpload(file: File): Promise<ShopPhotoUpload | null> {
    if (!import.meta.client) return null
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (bitmap === null) return null
    const scale = Math.min(1, SHOP_PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (context === null) {
      bitmap.close()
      return null
    }
    // Fundo branco: PNG transparente que vira JPEG ficaria com fundo preto.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
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
