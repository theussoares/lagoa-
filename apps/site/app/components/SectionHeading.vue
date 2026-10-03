<script setup lang="ts">
interface Props {
  eyebrow: string
  title: string
  lead?: string
  align?: 'start' | 'center'
}

withDefaults(defineProps<Props>(), { lead: undefined, align: 'start' })
</script>

<template>
  <header class="flex flex-col gap-4" :class="align === 'center' ? 'items-center text-center' : 'items-start'">
    <p class="eyebrow-tag text-primary">{{ eyebrow }}</p>
    <h2 class="type-section max-w-[18ch]">{{ title }}</h2>
    <p v-if="lead" class="type-lead text-lg">{{ lead }}</p>
  </header>
</template>
