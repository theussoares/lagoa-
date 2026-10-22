<script setup lang="ts">
import type { HomeActivityItem } from '#shared/schemas/homeOverview'
import { calendarDaysBetween } from '#shared/utils/time'

interface Props {
  activity: readonly HomeActivityItem[]
}

const props = defineProps<Props>()

const { t } = useI18n()

const AVATAR_PALETTES = [
  { bg: 'bg-primary/10', text: 'text-primary' },
  { bg: 'bg-secondary/10', text: 'text-secondary' },
  { bg: 'bg-success/10', text: 'text-success' },
  { bg: 'bg-(--color-sol-100) dark:bg-(--color-sol-900)', text: 'text-(--color-sol-700) dark:text-(--color-sol-200)' },
  { bg: 'bg-(--ui-bg-accented)', text: 'text-(--ui-text-toned)' },
]

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return 'CL'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  if (!first) return 'CL'
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase()
  }
  const last = parts[parts.length - 1] ?? first
  const c1 = first.charAt(0)
  const c2 = last.charAt(0)
  return (c1 + c2).toUpperCase()
}

function getAvatarPalette(index: number) {
  const palette = AVATAR_PALETTES[index % AVATAR_PALETTES.length]
  return palette ?? { bg: 'bg-primary/10', text: 'text-primary' }
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60_000)

  if (diffMinutes < 1) return 'Agora mesmo'
  if (diffMinutes < 60) return `Há ${diffMinutes} min`

  const days = calendarDaysBetween(date, now)
  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  if (days === 0) return `Hoje às ${timeStr}`
  if (days === 1) return `Ontem às ${timeStr}`
  return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`
}

function formatAmount(cents: number | null): string {
  if (!cents) return ''
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
}

function getEventDetails(item: HomeActivityItem) {
  const isStamp = item.unit === 'stamp'
  const unitLabel = isStamp
    ? item.units === 1 ? '1 carimbo' : `${item.units} carimbos`
    : item.units === 1 ? '1 ponto' : `${item.units} pontos`

  switch (item.kind) {
    case 'purchase':
      return {
        label: t('home.recentActivity.events.purchase', { amount: formatAmount(item.amountCents) }),
        sub: `+${unitLabel}`,
        icon: 'i-ph-receipt',
        iconColor: 'text-primary',
        to: '/clientes',
      }
    case 'bonus':
      return {
        label: t('home.recentActivity.events.bonus'),
        sub: `+${unitLabel}`,
        icon: 'i-ph-sparkle',
        iconColor: 'text-(--color-sol-700) dark:text-(--color-sol-200)',
        to: '/clientes',
      }
    case 'rewardReleased':
      return {
        label: t('home.recentActivity.events.rewardReleased', { reward: item.rewardTitle || 'Prêmio' }),
        sub: `${item.units} ${isStamp ? 'carimbos atingidos' : 'pontos atingidos'}`,
        icon: 'i-ph-gift',
        iconColor: 'text-secondary',
        to: '/clientes?filtro=premio-liberado',
      }
    case 'redemption':
      return {
        label: t('home.recentActivity.events.redemption', { reward: item.rewardTitle || 'Prêmio' }),
        sub: 'Entregue no balcão',
        icon: 'i-ph-trophy',
        iconColor: 'text-success',
        to: '/balcao',
      }
    case 'visit':
    default:
      return {
        label: t('home.recentActivity.events.visit'),
        sub: `+${unitLabel}`,
        icon: 'i-ph-check-circle',
        iconColor: 'text-primary',
        to: '/clientes',
      }
  }
}
</script>

<template>
  <section class="bg-(--ui-bg) rounded-2xl p-5 border border-(--ui-border-muted) shadow-(--lagoa-shadow-card) flex flex-col transition-all duration-200 hover:border-(--ui-border)">
    <!-- Header -->
    <header class="flex items-center justify-between pb-3">
      <h2 class="text-base font-bold text-(--ui-text-highlighted)">
        {{ t('home.recentActivity.title') }}
      </h2>
      <NuxtLink
        to="/clientes"
        class="group group/link no-underline hover:no-underline inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10 px-2 py-1 -mr-2 rounded-lg transition-all duration-150"
      >
        <span class="no-underline">{{ t('home.recentActivity.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover/link:translate-x-0.5" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio -->
    <div v-if="activity.length === 0" class="py-10 text-center flex flex-col items-center justify-center">
      <div class="size-12 rounded-full bg-(--ui-bg-elevated) text-(--ui-text-muted) flex items-center justify-center mb-3">
        <UIcon name="i-ph-clock-counter-clockwise" class="size-6" aria-hidden="true" />
      </div>
      <p class="text-sm font-semibold text-(--ui-text-toned)">
        {{ t('home.recentActivity.empty') }}
      </p>
      <p class="mt-1 text-xs text-(--ui-text-muted) max-w-xs">
        {{ t('home.recentActivity.emptyHint') }}
      </p>
    </div>

    <!-- Lista de Atividades -->
    <ul v-else class="divide-y divide-(--ui-border-muted)">
      <li v-for="(item, index) in activity" :key="item.id">
        <NuxtLink
          :to="getEventDetails(item).to"
          class="group flex items-center justify-between py-3 -mx-2 px-2.5 rounded-xl transition-all duration-150 hover:bg-primary/5 active:scale-[0.99]"
        >
          <!-- Avatar + Nome + Evento -->
          <div class="flex items-center gap-3 min-w-0 pr-3">
            <div
              class="size-9.5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none"
              :class="[getAvatarPalette(index).bg, getAvatarPalette(index).text]"
            >
              {{ getInitials(item.name) }}
            </div>

            <div class="min-w-0 flex flex-col">
              <div class="flex items-center gap-1.5 truncate">
                <span class="truncate text-sm font-semibold text-(--ui-text-highlighted) group-hover:text-primary transition-colors">
                  {{ item.name || t('customers.table.noName') }}
                </span>
                <span v-if="item.maskedPhone" class="text-xs text-(--ui-text-muted) font-mono shrink-0">
                  · {{ item.maskedPhone }}
                </span>
              </div>

              <div class="flex items-center gap-1 text-xs text-(--ui-text-muted) truncate mt-0.5">
                <UIcon :name="getEventDetails(item).icon" class="size-3.5 shrink-0" :class="getEventDetails(item).iconColor" aria-hidden="true" />
                <span class="truncate font-medium text-(--ui-text-toned)">{{ getEventDetails(item).label }}</span>
                <span class="text-(--ui-border)">·</span>
                <span class="text-(--ui-text-muted) tabular-nums shrink-0">{{ getEventDetails(item).sub }}</span>
              </div>
            </div>
          </div>

          <!-- Horário Relativo + Caret -->
          <div class="flex items-center gap-2 shrink-0">
            <span class="text-xs text-(--ui-text-muted) whitespace-nowrap tabular-nums">
              {{ formatRelativeTime(item.createdAt) }}
            </span>
            <UIcon name="i-ph-caret-right" class="size-4 text-(--ui-text-muted) group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" aria-hidden="true" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
