<script setup lang="ts">
import { VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'
import type { ComponentPublicInstance } from 'vue'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterAction, CounterFocusTarget } from '../../types/counter'

interface Props {
  /** "R$ 24,90" ou vazio. */
  amountText: string
  action: CounterAction | null
  issueLabel: string
  amountHint?: string
  amountPreview?: string
  pending: boolean
  amountErrorCode: 'invalidAmount' | null
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  amountInput: [value: string | number]
  issue: []
}

const props = withDefaults(defineProps<Props>(), { amountHint: undefined, amountPreview: undefined })
const emit = defineEmits<Emits>()

const issueButton = useTemplateRef<ComponentPublicInstance>('issueButton')
useFocusTarget(() => props.focusRequest, 'issueVisitQr', () => focusElement(issueButton.value))
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('issue')">
    <p class="text-pretty text-toned">{{ $t('counter.visitQr.lead', { minutes: VISIT_QR_TTL_MINUTES }) }}</p>

    <CounterAmountField
      v-if="action?.kind === 'amount'"
      :amount-text="amountText"
      :hint="amountHint"
      :error-code="amountErrorCode"
      :focus-request="focusRequest"
      @input="emit('amountInput', $event)"
    />
    <p v-if="amountPreview" aria-live="polite" class="tabular text-toned">{{ amountPreview }}</p>

    <UButton
      ref="issueButton"
      type="submit"
      size="xl"
      block
      icon="i-ph-qr-code"
      :label="issueLabel"
      :loading="pending"
      :disabled="action === null"
    />
  </form>
</template>
