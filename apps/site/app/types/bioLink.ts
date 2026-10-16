/** primary = ação do lojista (sol); secondary = ação do cliente (tinta com borda); default = apoio, linha compacta. */
export type BioLinkTone = 'primary' | 'secondary' | 'default'

export interface BioLinkItem {
  id: string
  href: string
  label: string
  hint: string
  icon: string
  tone: BioLinkTone
  /** Texto do botão de ação; só os cartões principais têm. */
  cta: string | null
  /** Abre fora do navegador embutido do Instagram (WhatsApp). */
  newTab: boolean
}

export interface BioLinkSection {
  id: string
  title: string | null
  items: BioLinkItem[]
}
