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
      iconBg: 'bg-[#f2eefb] dark:bg-[#2b1f47]',
      iconColor: 'text-[#7c4dff] dark:text-purple-300',
      badgeBg: 'bg-[#f0ebf8] dark:bg-[#341e4a]',
      badgeColor: 'text-[#7048e8] dark:text-purple-300',
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
      iconBg: 'bg-[#e0f2f7] dark:bg-[#0e353f]',
      iconColor: 'text-[#0f6381] dark:text-cyan-300',
      badgeBg: 'bg-[#e6f7f9] dark:bg-[#133d4e]',
      badgeColor: 'text-[#0f6381] dark:text-cyan-300',
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
      iconBg: 'bg-[#fef3c7] dark:bg-[#3b2a1a]',
      iconColor: 'text-[#d97706] dark:text-amber-300',
      badgeBg: 'bg-[#fef9c3] dark:bg-[#422e1b]',
      badgeColor: 'text-[#b45309] dark:text-amber-300',
      to: '/programa',
    })
  }

  return items
})

const seeAllLink = computed(() => (props.campaignsEnabled ? '/campanhas' : '/programa'))
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <div class="flex items-center gap-2">
        <UIcon name="i-ph-megaphone" class="size-4.5 text-[#0f6381] dark:text-cyan-400" aria-hidden="true" />
        <h2 class="text-base font-bold text-slate-900 dark:text-white">
          {{ t('home.activeCampaigns.title') }}
        </h2>
      </div>
      <NuxtLink
        :to="seeAllLink"
        class="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:underline"
      >
        <span>{{ t('home.activeCampaigns.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio -->
    <div v-if="activeItems.length === 0" class="py-6 text-center flex flex-col items-center justify-center">
      <div class="size-11 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mb-2.5">
        <UIcon name="i-ph-megaphone" class="size-5" aria-hidden="true" />
      </div>
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
        {{ t('home.activeCampaigns.empty') }}
      </p>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs mb-3">
        {{ t('home.activeCampaigns.emptyHint') }}
      </p>
      <UButton
        to="/programa"
        size="xs"
        variant="outline"
        color="neutral"
        :label="t('home.activeCampaigns.configureAction')"
      />
    </div>

    <!-- Lista de Campanhas / Regras ativas -->
    <ul v-else class="flex flex-col gap-2.5">
      <li v-for="item in activeItems" :key="item.id">
        <NuxtLink
          :to="item.to"
          class="group flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              :class="[item.iconBg, item.iconColor]"
            >
              <UIcon :name="item.icon" class="size-5" aria-hidden="true" />
            </div>
            <div class="min-w-0 flex flex-col">
              <span class="truncate text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                {{ item.title }}
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
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
