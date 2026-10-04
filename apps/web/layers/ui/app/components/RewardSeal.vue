<script setup lang="ts">
interface Props {
  label: string
  tilt?: number
  pressed?: boolean
}

const props = withDefaults(defineProps<Props>(), { tilt: -7, pressed: false })
</script>

<template>
  <span
    class="seal relative inline-flex items-center gap-2 rounded-md border-[3px] border-double border-secondary px-3 py-1.5 text-secondary"
    :class="pressed && ['stamp-press', 'seal-splash']"
    :style="{
      '--stamp-tilt': `${props.tilt}deg`,
      '--stamp-tilt-from': `${props.tilt - 14}deg`,
      transform: pressed ? undefined : `rotate(${props.tilt}deg)`,
    }"
  >
    <UIcon name="i-ph-seal-check-bold" class="size-5" aria-hidden="true" />
    <span class="letreiro text-[1.25rem] leading-none">{{ label }}</span>
  </span>
</template>

<style scoped>
/* Respingo de tinta: dois anéis abrem a partir do selo quando o prêmio acaba de ser batido. */
.seal-splash::before,
.seal-splash::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 2px solid currentColor;
  opacity: 0;
  pointer-events: none;
  animation: seal-ring 700ms var(--ease-out-expo) 280ms both;
}

.seal-splash::after {
  animation-delay: 420ms;
}

@keyframes seal-ring {
  from { opacity: 0.55; transform: scale(1); }
  to { opacity: 0; transform: scale(1.7); }
}

@media (prefers-reduced-motion: reduce) {
  .seal-splash::before,
  .seal-splash::after { animation: none; }
}
</style>
