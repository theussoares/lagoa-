<script setup lang="ts">
import type { TabBarItem } from '#layers/ui/app/types/wallet'

const { t } = useI18n()
useThemePreference('customer')
const route = useRoute()

const items = computed<[TabBarItem, TabBarItem, TabBarItem, TabBarItem]>(() => [
  { to: '/carteira', label: t('nav.wallet'), icon: 'i-ph-wallet', activeIcon: 'i-ph-wallet-fill' },
  { to: '/descobrir', label: t('nav.discover'), icon: 'i-ph-compass', activeIcon: 'i-ph-compass-fill' },
  { to: '/premios', label: t('nav.rewards'), icon: 'i-ph-gift', activeIcon: 'i-ph-gift-fill' },
  { to: '/perfil', label: t('nav.profile'), icon: 'i-ph-user-circle', activeIcon: 'i-ph-user-circle-fill' },
])
const action = computed<TabBarItem>(() => ({
  to: '/check-in',
  label: t('nav.checkIn'),
  icon: 'i-ph-qr-code-bold',
  activeIcon: 'i-ph-qr-code-bold',
}))
</script>

<template>
  <div class="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-[calc(env(safe-area-inset-bottom)+7rem)]">
    <main id="main" class="flex-1">
      <slot />
    </main>
    <AppTabBar :items="items" :action="action" :label="t('nav.mainLabel')" :current-path="route.path" />
  </div>
</template>
