<script setup lang="ts">
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterAction, CounterField, CounterFocusTarget } from '../../types/counter'

interface Props {
  amountText: string
  action: CounterAction | null
  submitLabel: string
  amountHint?: string
  pending: boolean
  phoneErrorCode: 'invalidPhone' | null
  amountErrorCode: 'invalidAmount' | null
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  fieldFocus: [field: CounterField]
  amountInput: [value: string | number]
  digit: [digit: string]
  backspace: []
  clear: []
  submit: []
}

const props = withDefaults(defineProps<Props>(), { amountHint: undefined })
const emit = defineEmits<Emits>()
const phone = defineModel<string>('phone', { required: true })

const { t } = useI18n()
const phoneDisplay = useTemplateRef<{ focus: () => void }>('phoneDisplay')
useFocusTarget(() => props.focusRequest, 'phone', () => phoneDisplay.value?.focus())
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('submit')">
    <PhoneDisplay
      ref="phoneDisplay"
      v-model="phone"
      :label="t('counter.launch.phoneLabel')"
      :hint="t('counter.launch.phoneHint')"
      :error="phoneErrorCode ? t('errors.invalidPhone') : undefined"
      @focusin="emit('fieldFocus', 'phone')"
      @clear="emit('clear')"
    />

    <CounterAmountField
      v-if="action?.kind === 'amount'"
      :amount-text="amountText"
      :hint="amountHint"
      :error-code="amountErrorCode"
      :focus-request="focusRequest"
      @input="emit('amountInput', $event)"
      @field-focus="emit('fieldFocus', 'amount')"
      @clear="emit('clear')"
    />

    <CounterKeypad
      :labels="{ clear: t('counter.launch.keypadClear'), backspace: t('counter.launch.keypadBackspace') }"
      :aria-label="t('counter.launch.keypadLabel')"
      :disabled="pending"
      @digit="emit('digit', $event)"
      @backspace="emit('backspace')"
      @clear="emit('clear')"
    />

    <UButton
      type="submit"
      size="xl"
      block
      :icon="action?.kind === 'amount' ? 'i-ph-receipt' : 'i-ph-seal-check'"
      :label="submitLabel"
      :loading="pending"
      :disabled="action === null"
    />
  </form>
</template>
