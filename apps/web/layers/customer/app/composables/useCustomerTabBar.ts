import type { TabBarLinkItem } from '#layers/ui/app/types/wallet'
import type { CustomerTabBar, CustomerTabBarItems } from '../types/tabBar'

/** Itens da barra de baixo, troca de aba deslizando e o menu Mais (só com a chave da fase B). */
export function useCustomerTabBar(): CustomerTabBar {
  const { t } = useI18n()
  const route = useRoute()
  const hitsEnabled = useHitsEnabled()
  const moreOpen = ref(false)

  const items = computed<CustomerTabBarItems>(() =>
    hitsEnabled
      ? [
          { to: '/descobrir', label: t('nav.discover'), icon: 'i-ph-compass', activeIcon: 'i-ph-compass-fill' },
          { to: '/hits', label: t('nav.hits'), icon: 'i-ph-fire', activeIcon: 'i-ph-fire-fill' },
          { to: '/carteira', label: t('nav.wallet'), icon: 'i-ph-wallet', activeIcon: 'i-ph-wallet-fill' },
          {
            kind: 'button',
            label: t('nav.more'),
            icon: 'i-ph-dots-three-outline',
            activeIcon: 'i-ph-dots-three-outline-fill',
            expanded: moreOpen.value,
            onSelect: () => {
              moreOpen.value = true
            },
          },
        ]
      : [
          { to: '/carteira', label: t('nav.wallet'), icon: 'i-ph-wallet', activeIcon: 'i-ph-wallet-fill' },
          { to: '/descobrir', label: t('nav.discover'), icon: 'i-ph-compass', activeIcon: 'i-ph-compass-fill' },
          { to: '/premios', label: t('nav.rewards'), icon: 'i-ph-gift', activeIcon: 'i-ph-gift-fill' },
          { to: '/perfil', label: t('nav.profile'), icon: 'i-ph-user-circle', activeIcon: 'i-ph-user-circle-fill' },
        ],
  )
  useSwipeNavigation(() => items.value.flatMap((item) => (item.kind === 'button' ? [] : [item.to])))

  const action = computed<TabBarLinkItem>(() => ({
    to: '/check-in',
    label: t('nav.checkIn'),
    icon: 'i-ph-qr-code-bold',
    activeIcon: 'i-ph-qr-code-bold',
  }))

  watch(
    () => route.fullPath,
    () => {
      moreOpen.value = false
    },
  )

  return reactive({ items, action, hitsEnabled, moreOpen })
}
