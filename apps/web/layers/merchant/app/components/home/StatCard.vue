<script setup lang="ts">
import type { HomeStatCard } from '../../types/home'

interface Props {
  card: HomeStatCard
}

defineProps<Props>()
</script>

<template>
  <article class="card flex min-h-32 flex-col justify-between gap-3 p-5">
    <h2 class="text-sm font-medium text-muted">{{ card.label }}</h2>
    <div class="flex flex-col gap-1">
      <p class="tabular font-display text-[1.75rem] leading-none font-bold text-highlighted">{{ card.value }}</p>
      <p v-if="card.note" class="tabular text-sm text-toned">{{ card.note }}</p>
    </div>
  </article>
</template>
