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
      <h1 class="font-display text-2xl sm:text-[1.75rem] font-bold tracking-tight text-(--ui-text-highlighted)">
        {{ t('home.title') }}
      </h1>
      <p class="mt-0.5 text-sm text-(--ui-text-muted)">
        {{ t('home.subtitle') }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 sm:pr-14">
      <!-- Data atual no fuso brasileiro -->
      <div class="flex items-center gap-2 text-sm text-(--ui-text-toned)">
        <UIcon name="i-ph-calendar-blank" class="size-4.5 text-(--ui-text-muted)" aria-hidden="true" />
        <span class="font-medium">{{ currentDateFormatted }}</span>
      </div>

      <div class="hidden sm:block h-4 w-px bg-(--ui-border)" aria-hidden="true" />

      <!-- Identificação da loja -->
      <div v-if="shopName" class="flex items-center gap-2 text-sm font-semibold text-(--ui-text-highlighted)">
        <div class="flex size-7 items-center justify-center rounded-full bg-(--ui-bg-muted) text-(--ui-text-toned)">
          <UIcon name="i-ph-user" class="size-4" aria-hidden="true" />
        </div>
        <span class="max-w-[170px] truncate" :title="shopName">{{ shopName }}</span>
      </div>

      <!-- Ação de atualizar -->
      <UButton
        variant="ghost"
        color="neutral"
        icon="i-ph-arrow-clockwise"
        class="size-9 justify-center rounded-lg cursor-pointer transition-all duration-150 hover:bg-(--ui-bg-muted) active:scale-95"
        :aria-label="t('home.refresh')"
        :loading="loading"
        @click="emit('refresh')"
      />
    </div>
  </header>
</template>
