<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { CounterDemoFocusTarget, CounterDemoMode } from '../types/counterDemo'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import { EXAMPLE_POINTS_PER_REAL } from '../utils/demoReceipt'

interface Props {
  mode: CounterDemoMode
  amount: string
  disabled: boolean
  showError: boolean
  focusRequest: FocusRequest<CounterDemoFocusTarget> | null
}

interface Emits {
  'update:mode': [value: CounterDemoMode]
  'update:amount': [value: string]
  generate: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const modes = computed(() => [
  { label: t('counter.demo.modeStamp'), value: 'stamp' },
  { label: t('counter.demo.modeValue'), value: 'value' },
])
const amountField = useTemplateRef<ComponentPublicInstance>('amountField')
const generateButton = useTemplateRef<ComponentPublicInstance>('generateButton')
useFocusTarget(() => props.focusRequest, 'amount', () => focusFirstInput(amountField.value))
useFocusTarget(() => props.focusRequest, 'generate', () => focusElement(generateButton.value))
</script>

<template>
  <div class="flex min-w-0 flex-col gap-6">
    <URadioGroup
      :model-value="mode"
      :items="modes"
      :legend="t('counter.demo.modeLabel')"
      :disabled="disabled"
      orientation="horizontal"
      variant="card"
      size="xl"
      @update:model-value="emit('update:mode', $event === 'value' ? 'value' : 'stamp')"
    />

    <UFormField v-if="mode === 'value'" :label="t('counter.demo.amountLabel')" :hint="t('counter.demo.amountHint', { rate: EXAMPLE_POINTS_PER_REAL })" :error="showError ? t('counter.demo.amountError') : undefined" name="amount" size="xl">
      <UInput ref="amountField" :model-value="amount" :disabled="disabled" inputmode="numeric" autocomplete="off" placeholder="0" size="xl" class="w-full" :ui="{ base: 'tabular text-2xl font-bold' }" @update:model-value="emit('update:amount', String($event))">
        <template #leading>
          <span class="text-muted" aria-hidden="true">{{ t('pricing.currency') }}</span>
        </template>
      </UInput>
    </UFormField>

    <UButton ref="generateButton" size="xl" block icon="i-ph-qr-code" :disabled="disabled" @click="emit('generate')">
      {{ t('counter.demo.generate') }}
    </UButton>
  </div>
</template>
