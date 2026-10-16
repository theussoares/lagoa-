export type BioLinkTone = 'primary' | 'default'

export interface BioLinkItem {
  id: string
  href: string
  label: string
  hint: string
  icon: string
  tone: BioLinkTone
  /** Abre fora do navegador embutido do Instagram (WhatsApp). */
  newTab: boolean
}

export interface BioLinkSection {
  id: string
  title: string | null
  items: BioLinkItem[]
}
