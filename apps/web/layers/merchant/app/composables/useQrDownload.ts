import type { QrPath } from '#layers/ui/app/types/qr'

const PNG_SIDE_PX = 1024
const DARK = '#000000'
const LIGHT = '#ffffff'

const svgOf = ({ size, d }: QrPath): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${LIGHT}"/><path d="${d}" fill="${DARK}"/></svg>`

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('QR image failed to load'))
    image.src = url
  })
}

/** Entrega o QR ao aparelho como PNG (branco e preto, com a margem do desenho); `document`/`URL`/canvas ficam só aqui. */
export function useQrDownload(): { savePng: (fileName: string, qr: QrPath) => Promise<boolean> } {
  async function savePng(fileName: string, qr: QrPath): Promise<boolean> {
    const svgUrl = URL.createObjectURL(new Blob([svgOf(qr)], { type: 'image/svg+xml' }))
    try {
      const image = await loadImage(svgUrl)
      const canvas = document.createElement('canvas')
      canvas.width = PNG_SIDE_PX
      canvas.height = PNG_SIDE_PX
      const context = canvas.getContext('2d')
      if (context === null) return false
      context.imageSmoothingEnabled = false
      context.drawImage(image, 0, 0, PNG_SIDE_PX, PNG_SIDE_PX)
      const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (png === null) return false
      const pngUrl = URL.createObjectURL(png)
      const link = document.createElement('a')
      link.href = pngUrl
      link.download = fileName
      link.click()
      URL.revokeObjectURL(pngUrl)
      return true
    } catch {
      return false
    } finally {
      URL.revokeObjectURL(svgUrl)
    }
  }
  return { savePng }
}
