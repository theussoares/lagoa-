<script setup lang="ts">
import type { DaySummary, WeekSummary } from '#shared/schemas/weekSummary'
import type { Program } from '#shared/schemas/program'

interface Props {
  week: WeekSummary
  program: Program | null
}

const props = defineProps<Props>()

const { t } = useI18n()

interface BarItem {
  isoDate: string
  weekday: string
  dateLabel: string
  value: number
  heightPercent: number
  isToday: boolean
}

const chartBars = computed<BarItem[]>(() => {
  const days = props.week.days
  if (!days || days.length === 0) return []

  const isStamps = props.program?.rules.mode === 'stamps'
  const pointsRate = props.program?.rules.mode === 'pointsPerVisit'
    ? props.program.rules.pointsPerVisit
    : props.program?.rules.mode === 'pointsPerCurrency'
      ? props.program.rules.pointsPerReal
      : 10

  const values = days.map((day) => {
    if (day.amountCents > 0) {
      return Math.round(day.amountCents / 100)
    }
    if (day.visits > 0) {
      return isStamps ? day.visits : day.visits * pointsRate
    }
    return 0
  })

  const maxValue = Math.max(...values, 1)

  return days.map((day, index) => {
    const date = new Date(`${day.isoDate}T12:00:00`)
    const rawWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')
    const weekday = rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1)
    const dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
    const value = values[index] ?? 0
    const isToday = index === days.length - 1

    const heightPercent = value === 0 ? 5 : Math.max(8, Math.round((value / maxValue) * 100))

    return {
      isoDate: day.isoDate,
      weekday,
      dateLabel,
      value,
      heightPercent,
      isToday,
    }
  })
})
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
    <!-- Header -->
    <div>
      <header class="flex items-center justify-between pb-1">
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          {{ t('home.shopSummary.title') }}
        </h2>
        <NuxtLink
          to="/balcao"
          class="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:underline"
        >
          <span>{{ t('home.shopSummary.details') }}</span>
          <UIcon name="i-ph-arrow-right" class="size-3" aria-hidden="true" />
        </NuxtLink>
      </header>

      <!-- Subheader com informação métrica -->
      <div class="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        <UIcon name="i-ph-info" class="size-3.5 text-slate-400" aria-hidden="true" />
        <span class="font-medium text-slate-700 dark:text-slate-200">
          {{ program?.rules.mode === 'stamps' ? t('home.shopSummary.accumulatedVisits') : t('home.shopSummary.accumulatedPoints') }}
        </span>
        <span class="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
        <span>{{ t('home.shopSummary.last7Days') }}</span>
      </div>
    </div>

    <!-- Gráfico de 7 Barras -->
    <div class="mt-8 pt-2">
      <div class="flex items-end justify-between gap-2 sm:gap-4 h-48 px-2 sm:px-4">
        <div
          v-for="bar in chartBars"
          :key="bar.isoDate"
          class="flex-1 flex flex-col items-center justify-end h-full group"
        >
          <!-- Valor acima da barra -->
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 tabular-nums">
            {{ bar.value > 0 ? bar.value : '0' }}
          </span>

          <!-- Coluna / Barra -->
          <div class="w-full max-w-[38px] flex items-end justify-center h-32">
            <div
              class="w-full rounded-t-[4px] transition-all duration-300"
              :class="bar.isToday ? 'bg-[#0f6381] dark:bg-cyan-400' : 'bg-[#9ed1df] hover:bg-[#85c3d4] dark:bg-[#1a4f61] dark:hover:bg-[#23647b]'"
              :style="{ height: `${bar.heightPercent}%` }"
              :title="`${bar.weekday} ${bar.dateLabel}: ${bar.value}`"
            />
          </div>

          <!-- Rótulo do dia e data abaixo da barra -->
          <div class="w-full border-t border-slate-100 dark:border-white/10 pt-2 mt-2 flex flex-col items-center gap-0.5">
            <span
              class="text-xs font-medium"
              :class="bar.isToday ? 'font-bold text-[#0f6381] dark:text-cyan-300' : 'text-slate-700 dark:text-slate-300'"
            >
              {{ bar.weekday }}
            </span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
              {{ bar.dateLabel }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
