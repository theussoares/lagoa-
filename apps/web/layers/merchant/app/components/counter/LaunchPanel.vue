<script setup lang="ts">
import type { DomainErrorCode } from '#shared/types/errors'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterAction, CounterField, CounterFocusTarget, LaunchReceiptModel } from '../../types/counter'

interface Props {
  amountText: string
  action: CounterAction | null
  submitLabel: string
  amountHint?: string
  pending: boolean
  phoneErrorCode: 'invalidPhone' | null
  amountErrorCode: 'invalidAmount' | null
  alertCode: DomainErrorCode | null
  programFailed: boolean
  receipt: { readonly key: string; readonly model: LaunchReceiptModel } | null
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  fieldFocus: [field: CounterField]
  amountInput: [value: string | number]
  digit: [digit: string]
  backspace: []
  clear: []
  submit: []
  retryProgram: []
}

withDefaults(defineProps<Props>(), { amountHint: undefined })
const emit = defineEmits<Emits>()
const phone = defineModel<string>('phone', { required: true })
</script>

<template>
  <PanelModule :title="$t('counter.launch.title')">
    <CounterLaunchForm
      v-model:phone="phone"
      :amount-text="amountText"
      :action="action"
      :submit-label="submitLabel"
      :amount-hint="amountHint"
      :pending="pending"
      :phone-error-code="phoneErrorCode"
      :amount-error-code="amountErrorCode"
      :focus-request="focusRequest"
      @field-focus="emit('fieldFocus', $event)"
      @amount-input="emit('amountInput', $event)"
      @digit="emit('digit', $event)"
      @backspace="emit('backspace')"
      @clear="emit('clear')"
      @submit="emit('submit')"
    />
    <CounterLaunchFeedback
      :alert-code="alertCode"
      :program-failed="programFailed"
      :receipt="receipt"
      @retry-program="emit('retryProgram')"
    />
  </PanelModule>
</template>
