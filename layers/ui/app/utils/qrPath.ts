import { encode } from 'uqr'

/** Margem branca exigida em volta do QR, em módulos. */
const QUIET_ZONE_MODULES = 4

export interface QrPath {
  /** Lado do quadrado em módulos, já com a margem. */
  readonly size: number
  /** Um `<path>` só com todos os módulos escuros: leve para desenhar e imprimir. */
  readonly d: string
}

/** ECC "M": aguenta cartaz amassado ou com reflexo sem ficar denso demais para câmera simples. */
export function qrPath(content: string): QrPath {
  const { data, size } = encode(content, { ecc: 'M', border: QUIET_ZONE_MODULES })
  const segments: string[] = []
  data.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) segments.push(`M${x} ${y}h1v1h-1z`)
    })
  })
  return { size, d: segments.join('') }
}
