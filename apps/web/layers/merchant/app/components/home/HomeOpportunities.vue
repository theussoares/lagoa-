<script setup lang="ts">
import { LAPSED_AFTER_DAYS } from '#shared/constants/domain'
import type { HomeOverview } from '#shared/schemas/homeOverview'
import type { Program } from '#shared/schemas/program'

interface Props {
  overview: HomeOverview
  program: Program | null
}

const props = defineProps<Props>()

const { t } = useI18n()

interface OpportunityItem {
  id: string
  title: string
  count: number
  icon: string
  iconColor: string
  badgeTone: 'rose' | 'amber' | 'emerald'
  to: string
}

const alerts = computed<OpportunityItem[]>(() => {
  const items: OpportunityItem[] = []

  // 1. Clientes sumidos
  if (props.overview.lapsed.total > 0) {
    items.push({
      id: 'lapsed',
      title: t('home.opportunities.lapsedAlert', { count: props.overview.lapsed.total, days: LAPSED_AFTER_DAYS }),
      count: props.overview.lapsed.total,
      icon: 'i-ph-user-minus',
      iconColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
      badgeTone: 'rose',
      to: '/clientes?filtro=sumidos',
    })
  }

  // 2. Clientes próximos de ganhar o prêmio
  if (props.overview.nearReward.total > 0) {
    items.push({
      id: 'near-reward',
      title: t('home.opportunities.nearRewardAlert', { count: props.overview.nearReward.total }),
      count: props.overview.nearReward.total,
      icon: 'i-ph-target',
      iconColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      badgeTone: 'amber',
      to: '/clientes?filtro=perto-do-premio',
    })
  }

  // 3. Prêmios disponíveis para resgate
  if (props.overview.rewardReady.total > 0) {
    items.push({
      id: 'reward-ready',
      title: t('home.opportunities.readyRewardAlert', { count: props.overview.rewardReady.total }),
      count: props.overview.rewardReady.total,
      icon: 'i-ph-gift',
      iconColor: 'bg-[#e8f6f8] dark:bg-[#0e353f] text-[#0f6381] dark:text-cyan-300',
      badgeTone: 'emerald',
      to: '/clientes?filtro=premio-liberado',
    })
  }

  return items
})
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col transition-all duration-200 hover:border-slate-200/90 dark:hover:border-white/15 hover:shadow-xs">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-lightning" class="size-4.5 text-[#0f6381] dark:text-cyan-400" aria-hidden="true" />
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          {{ t('home.opportunities.title') }}
        </h2>
      </div>
      <NuxtLink
        to="/clientes"
        class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:text-[#0b4d66] dark:hover:text-cyan-300 hover:bg-[#e8f6f8] dark:hover:bg-cyan-950/50 px-2 py-1 -mr-2 rounded-lg transition-all duration-150"
      >
        <span class="no-underline">{{ t('home.opportunities.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio (Sem oportunidades pendentes) -->
    <div v-if="alerts.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-check-circle" class="size-5.5" aria-hidden="true" />
      </div>
      <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {{ t('home.opportunities.empty') }}
      </p>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
        {{ t('home.opportunities.emptyHint') }}
      </p>
    </div>

    <!-- Lista de Oportunidades -->
    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in alerts" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-white/2 hover:border-[#0f6381]/30 dark:hover:border-cyan-400/30 hover:bg-[#e8f6f8]/40 dark:hover:bg-cyan-950/20 hover:shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              :class="item.iconColor"
            >
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-[#0f6381] dark:group-hover:text-cyan-300 transition-colors">
                {{ item.title }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums"
              :class="item.badgeTone === 'rose'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : item.badgeTone === 'amber'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                  : 'bg-[#e0f7f6] dark:bg-[#133d4e] text-[#0f6381] dark:text-cyan-300'"
            >
              {{ item.count }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-slate-300 dark:text-slate-600 group-hover:text-[#0f6381] dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all duration-150" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
