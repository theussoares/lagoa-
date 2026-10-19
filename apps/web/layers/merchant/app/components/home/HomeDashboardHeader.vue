<script setup lang="ts">
interface Props {
  shopName?: string | null
  loading?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const { t } = useI18n()

const currentDateFormatted = computed(() => {
  const now = new Date()
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
})
</script>

<template>
  <header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-slate-900 dark:text-white">
        {{ t('home.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
        {{ t('home.subtitle') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 sm:pr-14">
      <!-- Data atual no fuso brasileiro -->
      <div class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <UIcon name="i-ph-calendar-blank" class="size-4.5 text-slate-400" aria-hidden="true" />
        <span class="font-medium">{{ currentDateFormatted }}</span>
      </div>

      <div class="hidden sm:block h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />

      <!-- Identificação da loja -->
      <div v-if="shopName" class="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
        <div class="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <UIcon name="i-ph-user" class="size-4" aria-hidden="true" />
        </div>
        <span class="max-w-[170px] truncate" :title="shopName">{{ shopName }}</span>
        <UIcon name="i-ph-caret-down" class="size-3.5 text-slate-400" aria-hidden="true" />
      </div>

      <!-- Ação de atualizar -->
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-ph-arrow-clockwise"
        class="size-9 justify-center rounded-lg cursor-pointer transition-all duration-150 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95"
        :aria-label="t('home.refresh')"
        :loading="loading"
        @click="emit('refresh')"
      />
    </div>
  </header>
</template>
