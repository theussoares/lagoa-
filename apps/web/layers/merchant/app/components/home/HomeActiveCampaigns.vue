<script setup lang="ts">
import type { Program } from '#shared/schemas/program'
import type { CampaignOverview } from '#shared/schemas/campaign'

interface Props {
  program: Program | null
  campaignsOverview: CampaignOverview | null
  campaignsEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  campaignsEnabled: false,
})

const { t } = useI18n()

interface ActiveItem {
  id: string
  title: string
  description: string
  status: string
  icon: string
  iconBg: string
  iconColor: string
  badgeBg: string
  badgeColor: string
  to: string
}

const activeItems = computed<ActiveItem[]>(() => {
  const items: ActiveItem[] = []
  const rules = props.program?.bonusRules

  if (rules?.birthdayMultiplier.enabled) {
    items.push({
      id: 'birthday',
      title: t('home.activeCampaigns.birthdayTitle'),
      description: t('home.activeCampaigns.birthdayDesc'),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-gift',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      badgeBg: 'bg-primary/10',
      badgeColor: 'text-primary',
      to: '/programa',
    })
  }

  if (rules?.welcomeBonus.enabled) {
    const unitText = props.program?.rules.mode === 'stamps' ? 'carimbos' : 'pontos'
    items.push({
      id: 'welcome',
      title: t('home.activeCampaigns.welcomeTitle'),
      description: t('home.activeCampaigns.welcomeDesc', { units: `${rules.welcomeBonus.units} ${unitText}` }),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-sparkle',
      iconBg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)',
      iconColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
      badgeBg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)',
      badgeColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
      to: '/programa',
    })
  }

  if (rules?.surpriseDay.enabled) {
    items.push({
      id: 'surprise',
      title: t('home.activeCampaigns.surpriseTitle'),
      description: t('home.activeCampaigns.surpriseDesc'),
      status: t('home.activeCampaigns.statusOngoing'),
      icon: 'i-ph-calendar-star',
      iconBg: 'bg-secondary/10',
      iconColor: 'text-secondary',
      badgeBg: 'bg-secondary/10',
      badgeColor: 'text-secondary',
      to: '/programa',
    })
  }

  return items
})

const seeAllLink = computed(() => (props.campaignsEnabled ? '/campanhas' : '/programa'))
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col transition-all duration-200 hover:border-(--ui-border)">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-megaphone" class="size-4.5 text-primary" aria-hidden="true" />
        <h2 class="text-base font-bold text-(--ui-text-highlighted)">
          {{ t('home.activeCampaigns.title') }}
        </h2>
      </div>
      <NuxtLink
        :to="seeAllLink"
        class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 -mr-2 rounded-lg transition-all duration-150"
      >
        <span class="no-underline">{{ t('home.activeCampaigns.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio -->
    <div v-if="activeItems.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-megaphone" class="size-5" aria-hidden="true" />
      </div>
      <p class="text-sm font-medium text-(--ui-text-toned)">
        {{ t('home.activeCampaigns.empty') }}
      </p>
      <p class="mt-1 text-xs text-(--ui-text-muted) max-w-xs mb-3">
        {{ t('home.activeCampaigns.emptyHint') }}
      </p>
      <UButton
        to="/programa"
        size="xs"
        variant="outline"
        color="neutral"
        class="cursor-pointer transition-all duration-150 hover:bg-(--ui-bg-elevated) active:scale-95"
        :label="t('home.activeCampaigns.configureAction')"
      />
    </div>

    <!-- Lista de Campanhas / Regras ativas -->
    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in activeItems" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group flex items-center justify-between gap-3 p-3 rounded-xl border border-(--ui-border-muted) bg-(--ui-bg-muted) hover:border-primary/30 hover:bg-primary/5 hover:shadow-xs transition-all duration-150 active:scale-[0.99]"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              :class="[item.iconBg, item.iconColor]"
            >
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-bold text-(--ui-text-highlighted) group-hover:text-primary transition-colors">
                {{ item.title }}
              </span>
              <span class="text-xs text-(--ui-text-muted) line-clamp-1">
                {{ item.description }}
              </span>
            </div>
          </div>

          <span
            class="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
            :class="[item.badgeBg, item.badgeColor]"
          >
            {{ item.status }}
          </span>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
