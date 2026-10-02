<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()
const { session, signOut } = useMerchantSession()
const shopStatus = useShopStatus()
const { approveForTesting } = shopStatus

// A rede pode ter aprovado ou suspendido a loja desde o login.
onMounted(() => void shopStatus.refresh())

async function approve(): Promise<void> {
  if (approveForTesting !== null) await approveForTesting()
}

const items = computed<NavigationMenuItem[]>(() => [
  { label: t('nav.home'), icon: 'i-ph-house', to: '/painel' },
  { label: t('nav.counter'), icon: 'i-ph-storefront', to: '/balcao' },
  { label: t('nav.customers'), icon: 'i-ph-users', to: '/clientes' },
  { label: t('nav.program'), icon: 'i-ph-seal', to: '/programa' },
  { label: t('nav.campaigns'), icon: 'i-ph-megaphone', to: '/campanhas' },
])
</script>

<template>
  <div class="grid min-h-dvh grid-cols-[var(--merchant-sidebar-width)_minmax(0,1fr)] text-base [--merchant-sidebar-width:220px]">
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
      <UAlert
        v-if="shopStatus.status.value === 'pending'"
        color="warning"
        variant="subtle"
        icon="i-ph-hourglass-medium"
        class="mx-auto mb-5 max-w-[1200px] print:hidden"
        :title="t('merchantNav.pending.title')"
        :description="t('merchantNav.pending.description')"
        :actions="approveForTesting ? [{ label: t('merchantNav.pending.approveForTesting'), color: 'neutral', variant: 'outline', onClick: approve }] : []"
      />
      <UAlert
        v-else-if="shopStatus.status.value === 'suspended'"
        color="error"
        variant="subtle"
        icon="i-ph-prohibit"
        class="mx-auto mb-5 max-w-[1200px] print:hidden"
        :title="t('merchantNav.suspended.title')"
        :description="t('errors.shopSuspended')"
      />
      <slot />
    </main>
  </div>
</template>
