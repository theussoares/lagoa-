<script setup lang="ts">
import type { HomeMetrics, HomePeriod } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'

interface Props {
  comparison: Record<HomePeriod, HomeMetrics>
  program: Program | null
}

const props = defineProps<Props>()

const { t } = useI18n()

const selectedPeriod = ref<HomePeriod>('month')

const periodTabs = computed(() => [
  { label: t('home.monthSummary.periods.week'), value: 'week' as const },
  { label: t('home.monthSummary.periods.month'), value: 'month' as const },
  { label: t('home.monthSummary.periods.last30'), value: 'last30' as const },
])

const currentMetrics = computed(() => props.comparison[selectedPeriod.value] ?? {
  newCustomers: { current: 0, previous: 0 },
  visits: { current: 0, previous: 0 },
  purchases: { current: 0, previous: 0 },
  redemptions: { current: 0, previous: 0 },
})

interface MetricItem {
  id: string
  label: string
  current: number
  previous: number
  currentHeight: number
  previousHeight: number
  diffPercent: number | null
}

const metricList = computed<MetricItem[]>(() => {
  const m = currentMetrics.value

  const items = [
    { id: 'newCustomers', label: t('home.monthSummary.metrics.newCustomers'), current: m.newCustomers.current, previous: m.newCustomers.previous },
    { id: 'visits', label: t('home.monthSummary.metrics.visits'), current: m.visits.current, previous: m.visits.previous },
    { id: 'purchases', label: t('home.monthSummary.metrics.purchases'), current: m.purchases.current, previous: m.purchases.previous },
    { id: 'redemptions', label: t('home.monthSummary.metrics.redemptions'), current: m.redemptions.current, previous: m.redemptions.previous },
  ]

  const allValues = items.flatMap((i) => [i.current, i.previous])
  const maxValue = Math.max(...allValues, 1)

  return items.map((item) => {
    let diffPercent: number | null = null
    if (item.previous > 0) {
      diffPercent = Math.round(((item.current - item.previous) / item.previous) * 100)
    } else if (item.current > 0) {
      diffPercent = 100
    }

    const currentHeight = item.current === 0 ? 6 : Math.max(10, Math.round((item.current / maxValue) * 100))
    const previousHeight = item.previous === 0 ? 6 : Math.max(10, Math.round((item.previous / maxValue) * 100))

    return {
      ...item,
      currentHeight,
      previousHeight,
      diffPercent,
    }
  })
})
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
    <!-- Header -->
    <div>
      <header class="flex items-center justify-between pb-1">
        <div>
          <h2 class="text-base font-bold text-slate-900 dark:text-white">
            {{ t('home.monthSummary.title') }}
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {{ t('home.monthSummary.subtitle') }}
          </p>
        </div>

        <NuxtLink
          to="/balcao"
          class="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:underline"
        >
          <span>{{ t('home.monthSummary.details') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3" aria-hidden="true" />
        </NuxtLink>
      </header>

      <!-- Períodos (Tabs) e Legenda -->
      <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
        <div class="flex items-center gap-1 bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl">
          <button
            v-for="period in periodTabs"
            :key="period.value"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            :class="selectedPeriod === period.value
              ? 'bg-white dark:bg-white/15 text-[#0f6381] dark:text-cyan-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>

        <!-- Legenda -->
        <div class="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-[#0f6381] dark:bg-cyan-400" />
            <span>{{ t('home.monthSummary.current') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-[#9ed1df] dark:bg-[#1a4f61]" />
            <span>{{ t('home.monthSummary.previous') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Gráfico Comparativo -->
    <div class="mt-8 pt-2">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 h-52 px-2 sm:px-4">
        <div
          v-for="item in metricList"
          :key="item.id"
          class="flex flex-col items-center justify-end h-full group"
        >
          <!-- Variação percentual -->
          <div class="mb-2 text-center">
            <span
              v-if="item.diffPercent !== null"
              class="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              :class="item.diffPercent > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                : item.diffPercent < 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-white/10 text-slate-500'"
            >
              <UIcon
                :name="item.diffPercent > 0 ? 'i-ph-arrow-up' : item.diffPercent < 0 ? 'i-ph-arrow-down' : 'i-ph-minus'"
                class="size-2.5"
                aria-hidden="true"
              />
              {{ item.diffPercent > 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%` }}
            </span>
            <span v-else class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              —
            </span>
          </div>

          <!-- Barras Comparativas (Atual e Anterior lado a lado) -->
          <div class="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-32">
            <!-- Barra Anterior -->
            <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
              <span class="text-[11px] text-slate-400 dark:text-slate-500 mb-1 tabular-nums">
                {{ item.previous }}
              </span>
              <div
                class="w-full rounded-t-[4px] bg-[#9ed1df] dark:bg-[#1a4f61] transition-all duration-300"
                :style="{ height: `${item.previousHeight}%` }"
                :title="`${item.label} (Anterior): ${item.previous}`"
              />
            </div>

            <!-- Barra Atual -->
            <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-slate-900 dark:text-white mb-1 tabular-nums">
                {{ item.current }}
              </span>
              <div
                class="w-full rounded-t-[4px] bg-[#0f6381] dark:bg-cyan-400 transition-all duration-300"
                :style="{ height: `${item.currentHeight}%` }"
                :title="`${item.label} (Atual): ${item.current}`"
              />
            </div>
          </div>

          <!-- Rótulo da Métrica -->
          <div class="w-full border-t border-slate-100 dark:border-white/10 pt-2 mt-2 text-center">
            <span class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate block">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
