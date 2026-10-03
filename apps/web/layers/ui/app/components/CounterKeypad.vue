<script setup lang="ts">
import type { CounterKeypadLabels } from '../types/keypad'

interface Props {
  labels: CounterKeypadLabels
  disabled?: boolean
}

withDefaults(defineProps<Props>(), { disabled: false })
const emit = defineEmits<{ digit: [digit: string]; backspace: []; clear: [] }>()

const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const keyClass =
  'grid h-16 place-items-center rounded-(--ui-radius) bg-elevated text-highlighted transition-transform duration-(--lagoa-dur-fast) select-none hover:bg-accented active:scale-[0.96] disabled:opacity-50'
</script>

<template>
  <!-- Caminho de toque do Balcão. Pelo teclado físico se digita direto no visor,
       então as teclas ficam fora da ordem de Tab e não roubam o foco do campo. -->
  <div class="grid grid-cols-3 gap-2" role="group" @mousedown.prevent>
    <button
      v-for="digit in digits"
      :key="digit"
      type="button"
      tabindex="-1"
      :disabled="disabled"
      :class="[keyClass, 'tabular text-[1.75rem] font-bold']"
      @click="emit('digit', digit)"
    >
      {{ digit }}
    </button>
    <button type="button" tabindex="-1" :disabled="disabled" :class="[keyClass, 'text-[0.9375rem] font-semibold text-muted']" @click="emit('clear')">
      {{ labels.clear }}
    </button>
    <button type="button" tabindex="-1" :disabled="disabled" :class="[keyClass, 'tabular text-[1.75rem] font-bold']" @click="emit('digit', '0')">0</button>
    <button type="button" tabindex="-1" :disabled="disabled" :class="keyClass" :aria-label="labels.backspace" @click="emit('backspace')">
      <UIcon name="i-ph-backspace" class="size-7" aria-hidden="true" />
    </button>
  </div>
</template>
