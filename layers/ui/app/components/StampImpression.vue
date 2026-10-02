<script setup lang="ts">
interface Props {
  icon: string
  /** Inclinação fixa em graus (−6 a +6). */
  tilt: number
  tone?: 'ink' | 'reward'
  /** Recebe a batida do carimbo ao aparecer. */
  pressed?: boolean
  delayMs?: number
}

const props = withDefaults(defineProps<Props>(), { tone: 'ink', pressed: false, delayMs: 0 })

const style = computed(() => ({
  '--stamp-tilt': `${props.tilt}deg`,
  '--stamp-tilt-from': `${props.tilt - 12}deg`,
  transform: props.pressed ? undefined : `rotate(${props.tilt}deg)`,
  animationDelay: props.pressed ? `${props.delayMs}ms` : undefined,
}))
</script>

<template>
  <span
    class="impression relative grid size-full place-items-center rounded-full border-[2.5px] bg-current/8"
    :class="[tone === 'reward' ? 'text-secondary' : 'text-primary', pressed && 'stamp-press']"
    :style="style"
    aria-hidden="true"
  >
    <span class="absolute inset-[3px] rounded-full border border-current/70" />
    <UIcon :name="icon" class="size-[46%]" />
  </span>
</template>

<style scoped>
/* A tinta não cobre por igual: a borda de baixo pesa mais, como carimbo de verdade. */
.impression {
  border-bottom-width: 3px;
  opacity: 0.92;
}
</style>
