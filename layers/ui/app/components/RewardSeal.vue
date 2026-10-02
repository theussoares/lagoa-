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
    class="inline-flex items-center gap-2 rounded-md border-[3px] border-double border-secondary px-3 py-1.5 text-secondary"
    :class="pressed && 'stamp-press'"
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
