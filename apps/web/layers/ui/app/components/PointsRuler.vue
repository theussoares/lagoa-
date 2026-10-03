<script setup lang="ts">
interface Props {
  balance: number
  target: number
  /** "96 de 150 pontos" */
  label: string
}

const props = defineProps<Props>()

const fraction = computed(() => Math.min(1, props.balance / props.target))
</script>

<template>
  <figure class="flex flex-col gap-2" role="img" :aria-label="label">
    <InkRule :fraction="fraction" />
    <figcaption class="tabular text-base text-muted" aria-hidden="true">{{ label }}</figcaption>
  </figure>
</template>
