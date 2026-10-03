<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'

interface Props {
  title: string
  hint: string
  codeLabel: string
  modelValue: string[]
  length: number
  disabled?: boolean
  invalid?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false, invalid: false })
const emit = defineEmits<{ 'update:modelValue': [value: string[]]; complete: [value: string[]] }>()

const labelId = useId()
const codeLabelId = useId()
const pin = useTemplateRef<ComponentPublicInstance>('pin')

const code = computed({
  get: () => props.modelValue,
  // O código é lido em voz alta e digitado de qualquer jeito: sempre caixa-alta, sem espaço.
  set: (value: string[]) => emit('update:modelValue', value.map((char) => char.trim().toUpperCase())),
})

function focus(): void {
  const root: unknown = pin.value?.$el
  if (root instanceof HTMLElement) root.querySelector('input')?.focus()
}

defineExpose({ focus })
</script>

<template>
  <section :aria-labelledby="labelId" class="stub relative rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="px-4 pt-3 pb-3">
      <h2 :id="labelId" class="letreiro text-[0.9375rem] text-highlighted">{{ title }}</h2>
      <p class="mt-1 text-[0.9375rem] text-muted">{{ hint }}</p>
    </header>

    <StubPerforation />

    <div class="flex flex-col gap-4 p-4">
      <div class="flex flex-col gap-2">
        <span :id="codeLabelId" class="text-[0.9375rem] font-medium text-highlighted">{{ codeLabel }}</span>
        <UPinInput
          ref="pin"
          v-model="code"
          :length="length"
          size="xl"
          :disabled="disabled"
          :highlight="invalid"
          :color="invalid ? 'error' : 'secondary'"
          :aria-labelledby="codeLabelId"
          :ui="{ base: 'uppercase [font-stretch:62%] w-13' }"
          @complete="emit('complete', $event)"
        />
      </div>
      <slot />
    </div>
  </section>
</template>
