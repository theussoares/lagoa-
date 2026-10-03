import type { QrPath } from '#layers/ui/app/types/qr'

/** Cartaz do balcão, texto pronto em pt-BR. */
export interface CheckInPosterModel {
  readonly brand: string
  readonly shopName: string
  /** "Junte 10 carimbos e ganhe Corte grátis". */
  readonly headline: string
  readonly instruction: string
  readonly codeLabel: string
  readonly code: string
  readonly qr: QrPath
  /** Texto alternativo do QR: diz o que ele faz, não o link. */
  readonly qrLabel: string
}
