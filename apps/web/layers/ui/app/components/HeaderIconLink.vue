<script setup lang="ts">
interface Props {
  to: string
  label: string
  icon: string
  iconSize?: 'md' | 'lg'
}

withDefaults(defineProps<Props>(), { iconSize: 'md' })
</script>

<template>
  <NuxtLink
    :to="to"
    class="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/50 transition-colors duration-(--lagoa-dur-fast) hover:bg-white/25 focus-visible:outline-white"
    :aria-label="label"
  >
    <UIcon :name="icon" :class="iconSize === 'lg' ? 'size-7' : 'size-6'" aria-hidden="true" />
  </NuxtLink>
</template>
