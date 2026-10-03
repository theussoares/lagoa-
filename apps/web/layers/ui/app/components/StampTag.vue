<script setup lang="ts">
import type { StampTagTone } from '../types/tag'

interface Props {
  label: string
  tone?: StampTagTone
  icon?: string
}

const props = withDefaults(defineProps<Props>(), { tone: 'ink', icon: undefined })

const TONE_CLASS: Readonly<Record<StampTagTone, string>> = {
  ink: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  reward: 'text-secondary',
}
</script>

<template>
  <!-- Etiqueta batida com carimbo de borracha: letreiro dentro de moldura de tinta, levemente torta. -->
  <span
    class="type-tag inline-flex shrink-0 -rotate-2 items-center gap-1 rounded-[4px] px-1.5 py-0.5 whitespace-nowrap ring-[1.5px] ring-current"
    :class="TONE_CLASS[props.tone]"
  >
    <UIcon v-if="icon" :name="icon" class="size-3.5" aria-hidden="true" />{{ label }}
  </span>
</template>
