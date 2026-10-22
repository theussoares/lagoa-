import type { TabBarItem, TabBarLinkItem } from '#layers/ui/app/types/wallet'

export type CustomerTabBarItems = readonly [TabBarItem, TabBarItem, TabBarItem, TabBarItem]

/** Barra de baixo do cliente: com a chave da fase B ligada, o último item abre o menu Mais. */
export interface CustomerTabBar {
  readonly items: CustomerTabBarItems
  readonly action: TabBarLinkItem
  readonly hitsEnabled: boolean
  /** Menu Mais aberto; fecha sozinho a cada troca de rota. */
  moreOpen: boolean
}
