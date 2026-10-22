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
  badgeClass: string
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
      iconColor: 'bg-(--ui-error)/10 text-(--ui-error)',
      badgeClass: 'bg-(--ui-error)/10 text-(--ui-error)',
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
      iconColor: 'bg-(--color-sol-100) dark:bg-(--color-sol-900) text-(--color-sol-700) dark:text-(--color-sol-200)',
      badgeClass: 'bg-(--color-sol-100) dark:bg-(--color-sol-900) text-(--color-sol-700) dark:text-(--color-sol-200)',
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
      iconColor: 'bg-secondary/10 text-secondary',
      badgeClass: 'bg-secondary/10 text-secondary',
      to: '/clientes?filtro=premio-liberado',
    })
  }

  return items
})
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col transition-all duration-200 hover:border-(--ui-border)">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-lightning" class="size-4.5 text-primary" aria-hidden="true" />
        <h2 class="text-base font-bold text-(--ui-text-highlighted)">
          {{ t('home.opportunities.title') }}
        </h2>
      </div>
      <NuxtLink
        to="/clientes"
        class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 -mr-2 rounded-lg transition-all duration-150"
      >
        <span class="no-underline">{{ t('home.opportunities.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio (Sem oportunidades pendentes) -->
    <div v-if="alerts.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-success/10 text-success flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-check-circle" class="size-5.5" aria-hidden="true" />
      </div>
      <p class="text-sm font-semibold text-(--ui-text-toned)">
        {{ t('home.opportunities.empty') }}
      </p>
      <p class="mt-1 text-xs text-(--ui-text-muted) max-w-xs">
        {{ t('home.opportunities.emptyHint') }}
      </p>
    </div>

    <!-- Lista de Oportunidades -->
    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in alerts" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group flex items-center justify-between gap-3 p-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) hover:border-primary/30 hover:bg-primary/5 hover:shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              :class="item.iconColor"
            >
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-semibold text-(--ui-text-highlighted) group-hover:text-primary transition-colors">
                {{ item.title }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span
              class="text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums"
              :class="item.badgeClass"
            >
              {{ item.count }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-(--ui-text-muted) group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
