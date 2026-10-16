<script setup lang="ts">
import type { MerchantCustomerRow } from '#shared/schemas/customer'
import { calendarDaysBetween } from '#shared/utils/time'

interface Props {
  customers: readonly MerchantCustomerRow[]
  unit?: 'point' | 'stamp'
}

const props = withDefaults(defineProps<Props>(), {
  unit: 'point',
})

const { t } = useI18n()

const recentList = computed(() => props.customers.slice(0, 5))

const AVATAR_PALETTES = [
  { bg: 'bg-[#e0f2f7] dark:bg-[#0e353f]', text: 'text-[#0f6381] dark:text-cyan-300' },
  { bg: 'bg-[#f0ebf8] dark:bg-[#2b1f47]', text: 'text-[#7048e8] dark:text-purple-300' },
  { bg: 'bg-[#e6f4ea] dark:bg-[#1a3826]', text: 'text-[#137333] dark:text-emerald-300' },
  { bg: 'bg-[#e8f0fe] dark:bg-[#1f2d48]', text: 'text-[#1a73e8] dark:text-blue-300' },
  { bg: 'bg-[#f3e8fd] dark:bg-[#341e4a]', text: 'text-[#9333ea] dark:text-purple-300' },
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
  return palette ?? { bg: 'bg-[#e0f2f7] dark:bg-[#0e353f]', text: 'text-[#0f6381] dark:text-cyan-300' }
}

function formatRelativeVisit(isoDate: string | null): string {
  if (!isoDate) return t('customers.lastVisit.never')
  const days = calendarDaysBetween(new Date(isoDate), new Date())
  if (days <= 0) return t('customers.lastVisit.today')
  if (days === 1) return 'Há 1 dia'
  if (days < 7) return `Há ${days} dias`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'Há 1 semana'
  return `Há ${weeks} semanas`
}
</script>

<template>
  <section class="bg-white dark:bg-(--ui-bg) rounded-2xl p-5 border border-slate-100/90 dark:border-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col">
    <!-- Header com título e Ver todos -->
    <header class="flex items-center justify-between pb-3">
      <h2 class="text-base font-bold text-slate-900 dark:text-white">
        {{ t('home.recentCustomers.title') }}
      </h2>
      <NuxtLink
        to="/clientes"
        class="inline-flex items-center gap-1 text-xs font-semibold text-[#0f6381] dark:text-cyan-400 hover:underline"
      >
        <span>{{ t('home.recentCustomers.seeAll') }}</span>
        <UIcon name="i-ph-arrow-right" class="size-3" aria-hidden="true" />
      </NuxtLink>
    </header>

    <!-- Estado Vazio -->
    <div v-if="recentList.length === 0" class="py-10 text-center flex flex-col items-center justify-center">
      <div class="size-12 rounded-full bg-slate-100 dark:bg-white/5 text-slate-400 flex items-center justify-center mb-3">
        <UIcon name="i-ph-users" class="size-6" aria-hidden="true" />
      </div>
      <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
        {{ t('home.recentCustomers.empty') }}
      </p>
      <p class="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs">
        {{ t('home.recentCustomers.emptyHint') }}
      </p>
    </div>

    <!-- Tabela de Últimos Clientes -->
    <div v-else class="flex flex-col">
      <!-- Cabeçalho das colunas -->
      <div class="grid grid-cols-[1fr_80px_100px_24px] sm:grid-cols-[1fr_90px_120px_24px] items-center text-xs font-medium text-slate-400 dark:text-slate-500 py-2 border-b border-slate-100 dark:border-white/5">
        <span>{{ t('home.recentCustomers.columns.customer') }}</span>
        <span class="text-center">{{ unit === 'stamp' ? t('home.recentCustomers.columns.stamps') : t('home.recentCustomers.columns.points') }}</span>
        <span class="text-right pr-2">{{ t('home.recentCustomers.columns.lastVisit') }}</span>
        <span aria-hidden="true"></span>
      </div>

      <!-- Linhas dos clientes -->
      <ul class="divide-y divide-slate-100/90 dark:divide-white/5">
        <li v-for="(customer, index) in recentList" :key="customer.customerId">
          <NuxtLink
            to="/clientes"
            class="group grid grid-cols-[1fr_80px_100px_24px] sm:grid-cols-[1fr_90px_120px_24px] items-center py-3 -mx-2 px-2 rounded-xl transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
          >
            <!-- Avatar + Nome + Telefone -->
            <div class="flex items-center gap-3 min-w-0 pr-2">
              <div
                class="size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 select-none"
                :class="[getAvatarPalette(index).bg, getAvatarPalette(index).text]"
              >
                {{ getInitials(customer.firstName) }}
              </div>
              <div class="min-w-0 flex flex-col">
                <span class="truncate text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                  {{ customer.firstName || t('customers.table.noName') }}
                </span>
                <span class="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {{ customer.maskedPhone }}
                </span>
              </div>
            </div>

            <!-- Saldo de Pontos -->
            <div class="text-center font-semibold text-sm text-slate-700 dark:text-slate-200 tabular-nums">
              {{ customer.balance }}
            </div>

            <!-- Última Visita -->
            <div class="text-right pr-2 text-xs text-slate-400 dark:text-slate-400 whitespace-nowrap">
              {{ formatRelativeVisit(customer.lastVisitAt) }}
            </div>

            <!-- Chevron -->
            <div class="flex items-center justify-end text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
              <UIcon name="i-ph-caret-right" class="size-4" aria-hidden="true" />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </section>
</template>
