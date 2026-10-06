<script setup lang="ts">
import type { DomainErrorCode } from '#shared/types/errors'

interface Props {
  alertCode: DomainErrorCode | null
  programFailed: boolean
}

interface Emits {
  retryProgram: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div aria-live="polite" class="empty:hidden mt-4 flex flex-col print:hidden">
    <InkNote v-if="alertCode" tone="error" icon="i-ph-warning-circle" :description="$t(`errors.${alertCode}`)" />
    <InkNote
      v-else-if="programFailed"
      tone="error"
      icon="i-ph-warning-circle"
      :description="$t('counter.visitQr.programProblem')"
      :actions="[{ label: $t('common.retry'), onClick: () => emit('retryProgram') }]"
    />
  </div>
</template>
