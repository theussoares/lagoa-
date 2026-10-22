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
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col justify-between transition-all duration-200 hover:border-(--ui-border)">
    <!-- Header -->
    <div>
      <header class="flex items-center justify-between pb-1">
        <div>
          <h2 class="text-base font-bold text-(--ui-text-highlighted)">
            {{ t('home.monthSummary.title') }}
          </h2>
          <p class="text-xs text-(--ui-text-muted) mt-0.5">
            {{ t('home.monthSummary.subtitle') }}
          </p>
        </div>

        <NuxtLink
          to="/balcao"
          class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 -mr-2 rounded-lg transition-all duration-150"
        >
          <span class="no-underline">{{ t('home.monthSummary.details') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
        </NuxtLink>
      </header>

      <!-- Períodos (Tabs) e Legenda -->
      <div class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-1">
        <div class="flex items-center gap-1 bg-(--ui-bg-elevated) p-1 rounded-xl">
          <button
            v-for="period in periodTabs"
            :key="period.value"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150 cursor-pointer active:scale-95"
            :class="selectedPeriod === period.value
              ? 'bg-(--ui-bg) text-primary shadow-xs hover:shadow-sm'
              : 'text-(--ui-text-muted) hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg-accented)'"
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>

        <!-- Legenda -->
        <div class="flex items-center gap-4 text-xs font-medium text-(--ui-text-muted)">
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-primary" />
            <span>{{ t('home.monthSummary.current') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="size-2.5 rounded-full bg-primary/30" />
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
          class="flex flex-col items-center justify-end h-full group/col"
        >
          <!-- Variação percentual -->
          <div class="mb-2 text-center">
            <span
              v-if="item.diffPercent !== null"
              class="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
              :class="item.diffPercent > 0
                ? 'bg-success/10 text-success'
                : item.diffPercent < 0
                  ? 'bg-error/10 text-error'
                  : 'bg-(--ui-bg-elevated) text-(--ui-text-muted)'"
            >
              <UIcon
                :name="item.diffPercent > 0 ? 'i-ph-arrow-up' : item.diffPercent < 0 ? 'i-ph-arrow-down' : 'i-ph-minus'"
                class="size-2.5"
                aria-hidden="true"
              />
              {{ item.diffPercent > 0 ? `+${item.diffPercent}%` : `${item.diffPercent}%` }}
            </span>
            <span v-else class="text-[11px] font-medium text-(--ui-text-muted)">
              —
            </span>
          </div>

          <!-- Barras Comparativas (Atual e Anterior lado a lado) -->
          <div class="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-32">
            <!-- Barra Anterior -->
            <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
              <span class="text-[11px] text-(--ui-text-muted) mb-1 tabular-nums">
                {{ item.previous }}
              </span>
              <div
                class="w-full rounded-t-[4px] bg-primary/30 transition-all duration-300 group-hover/col:brightness-105"
                :style="{ height: `${item.previousHeight}%` }"
                :title="`${item.label} (Anterior): ${item.previous}`"
              />
            </div>

            <!-- Barra Atual -->
            <div class="w-1/2 max-w-[28px] flex flex-col items-center justify-end h-full">
              <span class="text-xs font-bold text-(--ui-text-highlighted) mb-1 tabular-nums">
                {{ item.current }}
              </span>
              <div
                class="w-full rounded-t-[4px] bg-primary transition-all duration-300 group-hover/col:brightness-110"
                :style="{ height: `${item.currentHeight}%` }"
                :title="`${item.label} (Atual): ${item.current}`"
              />
            </div>
          </div>

          <!-- Rótulo da Métrica -->
          <div class="w-full border-t border-(--ui-border-muted) pt-2 mt-2 text-center">
            <span class="text-xs font-semibold text-(--ui-text-toned) truncate block">
              {{ item.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
