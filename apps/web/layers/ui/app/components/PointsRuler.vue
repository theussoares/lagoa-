<script setup lang="ts">
interface Props {
  balance: number
  target: number
  /** "96 de 150 pontos" */
  label: string
}

const props = defineProps<Props>()

const TICKS = 10
const filled = computed(() => Math.min(1, props.balance / props.target))
</script>

<template>
  <figure class="flex flex-col gap-2">
    <div class="relative h-9" role="img" :aria-label="label">
      <!-- régua: marcas a cada 10%, a tinta corre por baixo -->
      <div class="absolute inset-x-0 bottom-0 h-3 overflow-hidden rounded-full bg-(--lagoa-rule)">
        <div
          class="ruler-fill h-full origin-left rounded-full bg-primary"
          :style="{ transform: `scaleX(${filled})` }"
        />
      </div>
      <span
        v-for="tick in TICKS + 1"
        :key="tick"
        class="absolute bottom-4 w-px bg-(--lagoa-slot)"
        :class="(tick - 1) % 5 === 0 ? 'h-4' : 'h-2'"
        :style="{ left: `calc(${((tick - 1) / TICKS) * 100}% - ${tick === TICKS + 1 ? 1 : 0}px)` }"
        aria-hidden="true"
      />
    </div>
    <figcaption class="tabular text-[0.9375rem] text-muted" aria-hidden="true">{{ label }}</figcaption>
  </figure>
</template>

<style scoped>
.ruler-fill {
  animation: ruler-ink var(--lagoa-dur-stamp) var(--ease-out-expo) both;
}

@keyframes ruler-ink {
  from { transform: scaleX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .ruler-fill { animation: none; }
}
</style>
