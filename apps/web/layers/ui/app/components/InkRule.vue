<script setup lang="ts">
import type { InkRuleTone } from '../types/progress'

interface Props {
  /** 0..1 */
  fraction: number
  tone?: InkRuleTone
}

const props = withDefaults(defineProps<Props>(), { tone: 'ink' })

const TONE_CLASS: Readonly<Record<InkRuleTone, string>> = {
  ink: 'text-primary',
  reward: 'text-secondary',
}

const TICKS = 10
const MAJOR_EVERY = 5
const percent = computed(() => Math.min(1, Math.max(0, props.fraction)) * 100)
const position = computed(() => `${percent.value}%`)
/** A ponta fica inteira dentro da régua nos extremos (meia ponta = 0.5rem). */
const caretLeft = computed(() => `clamp(0.5rem, ${percent.value}%, calc(100% - 0.5rem))`)
</script>

<template>
  <!-- Régua de papelaria: marcas a cada 10%, a tinta risca até onde o cliente chegou. -->
  <div class="relative h-7" :class="TONE_CLASS[props.tone]" aria-hidden="true">
    <span class="absolute inset-x-0 bottom-0 h-px bg-(--lagoa-slot)" />
    <span
      v-for="tick in TICKS + 1"
      :key="tick"
      class="absolute bottom-0 w-px bg-(--lagoa-slot)"
      :class="(tick - 1) % MAJOR_EVERY === 0 ? 'h-3' : 'h-1.5'"
      :style="{ left: `calc(${((tick - 1) / TICKS) * 100}% - ${tick === TICKS + 1 ? 1 : 0}px)` }"
    />
    <span class="ink-stroke absolute bottom-0 left-0 h-[3px] origin-left bg-current" :style="{ width: position }" />
    <UIcon
      name="i-ph-caret-down-fill"
      class="absolute top-0 size-4 -translate-x-1/2"
      :style="{ left: caretLeft }"
    />
  </div>
</template>

<style scoped>
.ink-stroke {
  animation: ink-stroke var(--lagoa-dur-stamp) var(--ease-out-expo) both;
}

@keyframes ink-stroke {
  from { transform: scaleX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .ink-stroke { animation: none; }
}
</style>
