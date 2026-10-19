<script setup lang="ts">
import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'
import type { WeekSummary } from '#shared/schemas/weekSummary'
import { calendarDaysBetween } from '#shared/utils/time'

interface Props {
  week: WeekSummary
  overview: HomeOverview
  program: Program | null
}

const props = defineProps<Props>()

const { t } = useI18n()

// Card 1 — Clientes ativos e total cadastrados
const activeCustomers = computed(() => props.week.customers)
const totalRegistered = computed(() => props.overview.totalCustomers)
const newCustomers = computed(() => props.week.newCustomers)

// Card 2 — Clientes sumidos
const lapsedTotal = computed(() => props.overview.lapsed.total)
const oldestLapsedDays = computed(() => {
  if (!props.overview.lapsed.oldestLastVisitAt) return null
  return calendarDaysBetween(new Date(props.overview.lapsed.oldestLastVisitAt), new Date())
})

// Card 3 — Prêmios entregues no período
const rewardsDelivered = computed(() => props.week.redemptions)

// Card 4 — Clientes próximos de ganhar o prêmio
const nearRewardTotal = computed(() => props.overview.nearReward.total)

const formatNumber = (num: number): string => new Intl.NumberFormat('pt-BR').format(num)
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
    <!-- Card 1 — Clientes ativos -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 transition-all duration-200 hover:border-slate-200/90 dark:hover:border-white/15 hover:shadow-xs">
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

    <!-- Card 2 — Clientes que estão sumindo (Prioridade Alta) -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 transition-all duration-200 hover:border-slate-200/90 dark:hover:border-white/15 hover:shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
          <UIcon name="i-ph-user-minus" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('home.indicators.lapsedCustomers') }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div class="min-w-0">
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(lapsedTotal) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            <template v-if="lapsedTotal === 0">
              {{ t('home.indicators.noLapsed') }}
            </template>
            <template v-else-if="oldestLapsedDays !== null">
              {{ t('home.indicators.oldestLapsed', { days: oldestLapsedDays }) }}
            </template>
            <template v-else>
              {{ t('home.indicators.lapsedDescription', { days: LAPSED_AFTER_DAYS }) }}
            </template>
          </p>
        </div>

        <NuxtLink
          to="/clientes?filtro=sumidos"
          class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:text-[#0b4d66] dark:hover:text-cyan-300 hover:bg-[#e8f6f8] dark:hover:bg-cyan-950/50 px-2 py-1 -mr-2 rounded-lg transition-all duration-150 shrink-0"
          :title="t('home.indicators.seeLapsedAction')"
        >
          <span class="no-underline">{{ t('home.indicators.seeLapsedAction') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </article>

    <!-- Card 3 — Prêmios entregues -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 transition-all duration-200 hover:border-slate-200/90 dark:hover:border-white/15 hover:shadow-xs">
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
            +{{ rewardsDelivered }}
          </span>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">
            {{ t('home.indicators.vsLastMonth') }}
          </p>
        </div>
      </div>
    </article>

    <!-- Card 4 — Clientes próximos de ganhar um prêmio -->
    <article class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between gap-4 transition-all duration-200 hover:border-slate-200/90 dark:hover:border-white/15 hover:shadow-xs">
      <div class="flex items-center gap-3.5">
        <div class="size-11 rounded-full bg-[#e8f6f8] text-[#0f6381] flex items-center justify-center shrink-0">
          <UIcon name="i-ph-target" class="size-5.5" aria-hidden="true" />
        </div>
        <h2 class="text-sm font-medium text-slate-600 dark:text-slate-300">
          {{ t('home.indicators.nearReward') }}
        </h2>
      </div>

      <div class="flex items-end justify-between gap-2">
        <div class="min-w-0">
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
            {{ formatNumber(nearRewardTotal) }}
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
            <template v-if="nearRewardTotal === 0">
              {{ t('home.indicators.noNearReward') }}
            </template>
            <template v-else>
              {{ t('home.indicators.nearRewardDescription') }}
            </template>
          </p>
        </div>

        <NuxtLink
          to="/clientes?filtro=perto-do-premio"
          class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:text-[#0b4d66] dark:hover:text-cyan-300 hover:bg-[#e8f6f8] dark:hover:bg-cyan-950/50 px-2 py-1 -mr-2 rounded-lg transition-all duration-150 shrink-0"
          :title="t('home.indicators.seeNearRewardAction')"
        >
          <span class="no-underline">{{ t('home.indicators.seeNearRewardAction') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
        </NuxtLink>
      </div>
    </article>
  </div>
</template>
