<script setup lang="ts">
import type { LedgerEntryModel } from '#layers/ui/app/types/wallet'
import type { TransportError } from '#shared/types/errors'

interface Props {
  status: 'loading' | 'error' | 'success'
  entries: readonly LedgerEntryModel[]
  errorCode: TransportError['code'] | null
}

interface Emits {
  retry: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="history-title">
    <h2 id="history-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
      {{ t('rewards.historyTitle') }}
    </h2>
    <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
      <USkeleton v-if="status === 'loading'" class="my-3 h-16" />
      <div v-else-if="status === 'error'" class="flex flex-wrap items-center justify-between gap-3 py-3">
        <p class="flex items-start gap-1.5 text-toned">
          <UIcon name="i-ph-wifi-slash" class="mt-1 size-4 shrink-0" aria-hidden="true" />
          {{ errorCode ? t(`errors.${errorCode}`) : '' }}
        </p>
        <UButton variant="outline" color="neutral" icon="i-ph-arrow-counter-clockwise" :label="t('common.retry')" @click="emit('retry')" />
      </div>
      <LedgerList v-else-if="entries.length > 0" :entries="entries" />
      <p v-else class="py-4 text-pretty text-muted">{{ t('rewards.historyEmpty') }}</p>
    </div>
  </section>
</template>
