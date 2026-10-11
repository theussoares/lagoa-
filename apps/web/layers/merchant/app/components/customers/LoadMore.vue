<script setup lang="ts">
import type { TransportError } from '#shared/types/errors'

interface Props {
  shown: number
  total: number
  loading: boolean
  errorCode: TransportError['code'] | null
}

interface Emits {
  (event: 'load'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 pt-2">
    <p class="tabular text-[0.9375rem] text-muted" aria-live="polite">{{ $t('customers.showing', { shown, total }) }}</p>
    <InkNote v-if="errorCode" tone="error" icon="i-ph-warning-circle" :description="$t(`errors.${errorCode}`)" live />
    <UButton variant="outline" color="neutral" class="min-h-11 px-5" :loading="loading" @click="emit('load')">
      {{ $t('customers.loadMore') }}
    </UButton>
  </div>
</template>
