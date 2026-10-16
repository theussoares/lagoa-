<script setup lang="ts">
import type { MerchantCustomerPage } from '#shared/schemas/customer'
import type { Program } from '#shared/schemas/program'

interface Props {
  program: Program | null
  readyCustomers: MerchantCustomerPage | null
  allCustomers: MerchantCustomerPage | null
}

const props = defineProps<Props>()

const { t } = useI18n()

interface RedemptionItem {
  id: string
  title: string
  pointsRequired: string
  status: string
  isAvailable: boolean
  icon: string
  to: string
}

const isStamps = computed(() => props.program?.rules.mode === 'stamps')
const targetPoints = computed(() => props.program?.rules.target ?? 100)
const unitName = computed(() => (isStamps.value ? 'carimbos' : 'pontos'))

const redemptionItems = computed<RedemptionItem[]>(() => {
  if (!props.program) return []

  const items: RedemptionItem[] = []
  const rewardTitle = props.program.reward.title || 'Prêmio do clube'
  const readyCount = props.readyCustomers?.total ?? 0

  // Se houver clientes com prêmio liberado
  if (readyCount > 0) {
    items.push({
      id: 'ready-reward',
      title: rewardTitle,
      pointsRequired: `${targetPoints.value} ${unitName.value}`,
      status: readyCount === 1 ? t('home.upcomingRedemptions.statusAvailable') : `${t('home.upcomingRedemptions.statusAvailable')} (${readyCount})`,
      isAvailable: true,
      icon: 'i-ph-gift',
      to: '/clientes?filtro=prontos',
    })
  }

  // Clientes mais próximos da meta (ordenados por maior saldo abaixo da meta)
  if (props.allCustomers && props.allCustomers.items.length > 0) {
    const progressing = props.allCustomers.items
      .filter((c) => c.balance > 0 && c.balance < targetPoints.value)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, readyCount > 0 ? 2 : 3)

    for (const customer of progressing) {
      const remaining = targetPoints.value - customer.balance
      items.push({
        id: `customer-${customer.customerId}`,
        title: customer.firstName || rewardTitle,
        pointsRequired: `${customer.balance} de ${targetPoints.value} ${unitName.value}`,
        status: `Faltam ${remaining}`,
        isAvailable: false,
        icon: 'i-ph-user',
        to: '/clientes',
      })
    }
  }

  // Se nenhum cliente tiver progresso ainda, mostra a meta principal configurada do programa
  if (items.length === 0) {
    items.push({
      id: 'configured-reward',
      title: rewardTitle,
      pointsRequired: `${targetPoints.value} ${unitName.value}`,
      status: t('home.upcomingRedemptions.statusInProgress'),
      isAvailable: false,
      icon: 'i-ph-gift',
      to: '/programa',
    })
  }

  return items
})
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-trophy" class="size-4.5 text-[#0f6381] dark:text-cyan-400" aria-hidden="true" />
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          {{ t('home.upcomingRedemptions.title') }}
        </h2>
      </div>
      <NuxtLink
        to="/clientes?filtro=prontos"
        class="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:underline"
      >
        <span>{{ t('home.upcomingRedemptions.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio -->
    <div v-if="redemptionItems.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-gift" class="size-5" aria-hidden="true" />
      </div>
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
        {{ t('home.upcomingRedemptions.empty') }}
      </p>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
        {{ t('home.upcomingRedemptions.emptyHint') }}
      </p>
    </div>

    <!-- Lista de Próximos Resgates -->
    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in redemptionItems" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-10 rounded-full bg-[#e8f6f8] dark:bg-[#0e353f] text-[#0f6381] dark:text-cyan-300 flex items-center justify-center shrink-0">
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                {{ item.title }}
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {{ item.pointsRequired }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
              :class="item.isAvailable
                ? 'bg-[#e0f7f6] dark:bg-[#133d4e] text-[#0f6381] dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'"
            >
              {{ item.status }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
