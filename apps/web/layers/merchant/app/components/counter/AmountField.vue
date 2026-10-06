<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import type { CounterFocusTarget } from '../../types/counter'

interface Props {
  /** "R$ 24,90" ou vazio. */
  amountText: string
  hint?: string
  errorCode: 'invalidAmount' | null
  focusRequest: FocusRequest<CounterFocusTarget> | null
}

interface Emits {
  input: [value: string | number]
}

const props = withDefaults(defineProps<Props>(), { hint: undefined })
const emit = defineEmits<Emits>()

const field = useTemplateRef<ComponentPublicInstance>('field')
useFocusTarget(() => props.focusRequest, 'amount', () => focusFirstInput(field.value))
</script>

<template>
  <UFormField
    :label="$t('counter.visitQr.amountLabel')"
    :hint="hint"
    :error="errorCode ? $t('errors.invalidAmount') : undefined"
    name="amount"
    size="xl"
  >
    <template #error="{ error: message }">
      <FieldErrorMessage :message="typeof message === 'string' ? message : undefined" />
    </template>
    <UInput
      ref="field"
      :model-value="amountText"
      inputmode="numeric"
      autocomplete="off"
      placeholder="R$ 0,00"
      size="xl"
      class="w-full"
      :ui="{ base: 'tabular text-2xl font-bold' }"
      @update:model-value="emit('input', $event)"
    />
  </UFormField>
</template>
