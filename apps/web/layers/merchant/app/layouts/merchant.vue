<script setup lang="ts">
import type { SpineNavItem } from '#layers/ui/app/types/spine'

const { t } = useI18n()
const { session, signOut } = useMerchantSession()
const shopStatus = useShopStatus()
const { approveForTesting } = shopStatus
const campaignsEnabled = useCampaignsEnabled()

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
  { label: t('nav.shopLink'), icon: 'i-ph-cursor-click', to: '/botao-do-card' },
  ...(campaignsEnabled ? [{ label: t('nav.campaigns'), icon: 'i-ph-megaphone', to: '/campanhas' }] : []),
])
const footerItems = computed<SpineNavItem[]>(() => [{ label: t('merchantNav.settings'), icon: 'i-ph-gear-six', to: '/configuracoes' }])
</script>

<template>
  <div class="grid min-h-dvh grid-cols-[var(--merchant-sidebar-width)_minmax(0,1fr)] bg-[#f8fafc] dark:bg-[#081e26] text-base [--merchant-sidebar-width:230px] print:block">
    <!-- A barra lateral em azul-petróleo muito escuro, com linha divisória e contraste refinado para o tema escuro -->
    <aside class="dark print:hidden sticky top-0 flex h-dvh flex-col bg-[#03131a] border-r border-white/10 px-3.5 py-6 text-default">
      <div class="flex flex-col items-start px-2 pb-7">
        <div class="rounded-lg border-[1.5px] border-cyan-400/90 px-2.5 py-1 text-sm font-extrabold tracking-wider text-cyan-400">
          LAGOA+
        </div>
        <p v-if="session" class="mt-2.5 w-full truncate text-[0.875rem] font-medium text-slate-300/70" :title="session.shopName">
          {{ session.shopName }}
        </p>
      </div>
      <SpineNav :items="items" :footer-items="footerItems" :label="t('merchantNav.label')" />
      <button
        type="button"
        class="mt-1 flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9375rem] font-medium text-slate-300/80 transition-all duration-(--lagoa-dur-fast) hover:bg-white/5 hover:text-white"
        @click="signOut"
      >
        <UIcon name="i-ph-sign-out" class="size-5 shrink-0 text-slate-400" aria-hidden="true" />
        {{ t('merchantNav.signOut') }}
      </button>
    </aside>
    <main id="main" class="min-w-0 px-6 sm:px-8 py-7">
      <InkNote
        v-if="shopStatus.status.value === 'pending'"
        tone="warning"
        icon="i-ph-hourglass-medium"
        class="mx-auto mb-5 max-w-[1300px] print:hidden"
        :title="t('merchantNav.pending.title')"
        :description="t('merchantNav.pending.description')"
        :actions="approveForTesting ? [{ label: t('merchantNav.pending.approveForTesting'), onClick: approve }] : []"
      />
      <InkNote
        v-else-if="shopStatus.status.value === 'suspended'"
        tone="error"
        icon="i-ph-prohibit"
        class="mx-auto mb-5 max-w-[1300px] print:hidden"
        :title="t('merchantNav.suspended.title')"
        :description="t('errors.shopSuspended')"
      />
      <slot />
    </main>
  </div>
</template>
