export type LinkTone = 'primary' | 'default'

export interface LinkItem {
  id: string
  href: string
  label: string
  hint: string
  icon: string
  tone: LinkTone
  /** Abre fora do navegador embutido do Instagram (WhatsApp). */
  newTab: boolean
}

export interface LinkSection {
  id: string
  title: string | null
  items: LinkItem[]
}
