<script setup lang="ts">
import type { DomainErrorCode } from '#shared/types/errors'
import type { LaunchReceiptModel } from '../../types/counter'

interface Props {
  alertCode: DomainErrorCode | null
  programFailed: boolean
  receipt: { readonly key: string; readonly model: LaunchReceiptModel } | null
}

interface Emits {
  retryProgram: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const STAMP_ICON = 'i-ph-check-fat-bold'
</script>

<template>
  <div aria-live="polite" class="empty:hidden mt-4 flex flex-col">
    <InkNote v-if="alertCode" tone="error" icon="i-ph-warning-circle" :description="$t(`errors.${alertCode}`)" />
    <InkNote
      v-else-if="programFailed"
      tone="error"
      icon="i-ph-warning-circle"
      :description="$t('counter.launch.programProblem')"
      :actions="[{ label: $t('common.retry'), onClick: () => emit('retryProgram') }]"
    />
    <CounterLaunchReceipt v-else-if="receipt" :key="receipt.key" :receipt="receipt.model" :icon="STAMP_ICON" />
  </div>
</template>
