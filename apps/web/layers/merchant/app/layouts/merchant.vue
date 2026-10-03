<script setup lang="ts">
import type { SpineNavItem } from '#layers/ui/app/types/spine'

const { t } = useI18n()
const { session, signOut } = useMerchantSession()
const shopStatus = useShopStatus()
const { approveForTesting } = shopStatus

// A rede pode ter aprovado ou suspendido a loja desde o login.
onMounted(() => void shopStatus.refresh())

async function approve(): Promise<void> {
  if (approveForTesting !== null) await approveForTesting()
}

const items = computed<SpineNavItem[]>(() => [
  { label: t('nav.home'), icon: 'i-ph-house', to: '/painel' },
  { label: t('nav.counter'), icon: 'i-ph-storefront', to: '/balcao' },
  { label: t('nav.customers'), icon: 'i-ph-users', to: '/clientes' },
  { label: t('nav.program'), icon: 'i-ph-seal', to: '/programa' },
  { label: t('nav.campaigns'), icon: 'i-ph-megaphone', to: '/campanhas' },
])
const footerItems = computed<SpineNavItem[]>(() => [{ label: t('merchantNav.settings'), icon: 'i-ph-gear-six', to: '/configuracoes' }])
</script>

<template>
  <div class="grid min-h-dvh grid-cols-[var(--merchant-sidebar-width)_minmax(0,1fr)] text-base [--merchant-sidebar-width:248px]">
    <!-- A barra é sempre escura, no claro e no escuro: os tokens escuros valem aqui dentro. -->
    <aside class="dark sticky top-0 flex h-dvh flex-col bg-(--lagoa-header) px-3 py-5 text-default">
      <div class="flex flex-col items-start gap-2 px-4 pb-7">
        <p class="font-display flex items-center gap-2 text-2xl font-bold text-highlighted">
          <span class="size-2.5 rounded-full bg-(--color-lima-400)" aria-hidden="true" />
          {{ t('app.name') }}
        </p>
        <p v-if="session" class="mt-2 w-full truncate text-[0.9375rem] text-toned" :title="session.shopName">{{ session.shopName }}</p>
      </div>
      <SpineNav :items="items" :footer-items="footerItems" :label="t('merchantNav.label')" />
      <button
        type="button"
        class="flex min-h-12 items-center gap-3 rounded-full px-4 text-[0.9375rem] text-toned transition-colors hover:bg-white/5 duration-(--lagoa-dur-fast) hover:text-highlighted"
        @click="signOut"
      >
        <UIcon name="i-ph-sign-out" class="size-5 shrink-0 text-muted" aria-hidden="true" />
        {{ t('merchantNav.signOut') }}
      </button>
    </aside>
    <main id="main" class="min-w-0 px-8 py-6">
      <InkNote
        v-if="shopStatus.status.value === 'pending'"
        tone="warning"
        icon="i-ph-hourglass-medium"
        class="mx-auto mb-5 max-w-[1200px] print:hidden"
        :title="t('merchantNav.pending.title')"
        :description="t('merchantNav.pending.description')"
        :actions="approveForTesting ? [{ label: t('merchantNav.pending.approveForTesting'), onClick: approve }] : []"
      />
      <InkNote
        v-else-if="shopStatus.status.value === 'suspended'"
        tone="error"
        icon="i-ph-prohibit"
        class="mx-auto mb-5 max-w-[1200px] print:hidden"
        :title="t('merchantNav.suspended.title')"
        :description="t('errors.shopSuspended')"
      />
      <slot />
    </main>
  </div>
</template>
