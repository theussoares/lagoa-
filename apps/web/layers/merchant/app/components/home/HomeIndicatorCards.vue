<script setup lang="ts">
import type { MerchantCustomerPage } from '#shared/schemas/customer'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'

interface Props {
  week: WeekSummary
  allCustomers: MerchantCustomerPage | null
  program: Program | null
}

const props = defineProps<Props>()

const { t } = useI18n()

const isStamps = computed(() => props.program?.rules.mode === 'stamps')
const targetPoints = computed(() => props.program?.rules.target ?? 100)

// Card 1 — Clientes ativos e total cadastrados
const activeCustomers = computed(() => props.week.customers)
const totalRegistered = computed(() => props.allCustomers?.total ?? null)
const newCustomers = computed(() => props.week.newCustomers)

// Card 2 — Pontos resgatados no período
const pointsRedeemed = computed(() => {
  if (isStamps.value) {
    return props.week.redemptions * targetPoints.value
  }
  return props.week.redemptions * targetPoints.value
})

// Card 3 — Prêmios entregues no período
const rewardsDelivered = computed(() => props.week.redemptions)

// Card 4 — Saldo total de pontos disponíveis
const totalPointsBalance = computed(() => {
  if (!props.allCustomers || props.allCustomers.items.length === 0) return 0
  return props.allCustomers.items.reduce((total, customer) => total + customer.balance, 0)
})

const formatNumber = (num: number): string => new Intl.NumberFormat('pt-BR').format(num)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
    <!-- Card 1 — Clientes ativos -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
          <UIcon name="i-ph-users" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('home.indicators.activeCustomers') }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(activeCustomers) }}
          </p>
          <p v-if="totalRegistered !== null" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('home.indicators.ofRegistered', { total: formatNumber(totalRegistered) }) }}
          </p>
        </div>

        <div v-if="newCustomers > 0" class="text-right pb-0.5">
          <span class="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-ph-arrow-up" class="size-3" aria-hidden="true" />
            +{{ newCustomers }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">
            {{ t('home.indicators.thisMonth') }}
          </p>
        </div>
      </div>
    </article>

    <!-- Card 2 — Pontos resgatados -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
          <UIcon name="i-ph-coins" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ isStamps ? t('home.indicators.stampsRedeemed') : t('home.indicators.pointsRedeemed') }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(pointsRedeemed) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('home.indicators.thisMonth') }}
          </p>
        </div>

        <div v-if="rewardsDelivered > 0" class="text-right pb-0.5">
          <span class="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-ph-arrow-up" class="size-3" aria-hidden="true" />
            +{{ rewardsDelivered }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">
            {{ t('home.indicators.vsLastMonth') }}
          </p>
        </div>
      </div>
    </article>

    <!-- Card 3 — Prêmios entregues -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
          <UIcon name="i-ph-gift" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('home.indicators.deliveredRewards') }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(rewardsDelivered) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('home.indicators.thisMonth') }}
          </p>
        </div>

        <div v-if="rewardsDelivered > 0" class="text-right pb-0.5">
          <span class="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <UIcon name="i-ph-arrow-up" class="size-3" aria-hidden="true" />
            {{ rewardsDelivered }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">
            {{ t('home.indicators.vsLastMonth') }}
          </p>
        </div>
      </div>
    </article>

    <!-- Card 4 — Saldo de pontos (total) -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3.5">
          <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
            <UIcon name="i-ph-shield-check" class="size-5.5" aria-hidden="true" />
          </div>
          <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
            {{ isStamps ? t('home.indicators.stampsBalance') : t('home.indicators.pointsBalance') }}
          </h2>
        </div>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div>
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(totalPointsBalance) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ isStamps ? t('home.indicators.stampsAvailable') : t('home.indicators.pointsAvailable') }}
          </p>
        </div>

        <NuxtLink
          to="/clientes"
          class="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shrink-0"
          :title="t('home.recentCustomers.seeAll')"
        >
          <UIcon name="i-ph-arrow-right" class="size-4" aria-hidden="true" />
        </NuxtLink>
      </div>
    </article>
  </div>
</template>
