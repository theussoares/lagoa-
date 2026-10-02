<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const { session, signOut } = useMerchantSession()

const items = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.home'), icon: 'i-ph-house', to: '/painel' },
  { label: t('nav.counter'), icon: 'i-ph-storefront', to: '/balcao' },
  { label: t('nav.customers'), icon: 'i-ph-users', to: '/clientes' },
  { label: t('nav.program'), icon: 'i-ph-seal', to: '/programa' },
  { label: t('nav.campaigns'), icon: 'i-ph-megaphone', to: '/campanhas' },
])
</script>

<template>
  <div class="grid min-h-dvh grid-cols-[220px_minmax(0,1fr)] text-base">
    <!-- A barra é sempre "caderneta à noite", no claro e no escuro: os tokens escuros valem aqui dentro. -->
    <aside class="dark sticky top-0 flex h-dvh flex-col bg-(--lagoa-desk) px-3 py-5 text-default">
      <div class="px-2.5 pb-6">
        <p class="letreiro text-xl text-highlighted">{{ t('app.name') }}</p>
        <p v-if="session" class="mt-1 truncate text-[0.9375rem] text-muted" :title="session.shopName">{{ session.shopName }}</p>
      </div>
      <nav :aria-label="t('merchantNav.label')">
        <UNavigationMenu
          :items="items"
          orientation="vertical"
          color="primary"
          :ui="{ link: 'min-h-11 text-[0.9375rem]', linkLeadingIcon: 'size-5' }"
        />
      </nav>
      <UButton
        class="mt-auto"
        variant="ghost"
        color="neutral"
        icon="i-ph-sign-out"
        :label="t('merchantNav.signOut')"
        @click="signOut"
      />
    </aside>
    <main id="main" class="min-w-0 px-8 py-6">
      <slot />
    </main>
  </div>
</template>
