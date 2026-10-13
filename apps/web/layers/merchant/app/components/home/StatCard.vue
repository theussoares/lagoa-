<script setup lang="ts">
import type { HomeStatCard } from '../../types/home'

interface Props {
  card: HomeStatCard
}

defineProps<Props>()

/** Cada número tem a sua cor da paleta, num degradê suave que some no fundo do card. */
const GRADIENT_BY_CARD: Record<HomeStatCard['id'], string> = {
  sales: 'from-sol-200 via-sol-50 dark:from-sol-500/30 dark:via-sol-500/5',
  visits: 'from-tinta-200 via-tinta-50 dark:from-tinta-400/30 dark:via-tinta-400/5',
  redemptions: 'from-folha-200 via-folha-50 dark:from-folha-400/30 dark:via-folha-400/5',
  lapsed: 'from-carimbo-200 via-carimbo-50 dark:from-carimbo-400/30 dark:via-carimbo-400/5',
}
</script>

<template>
  <article class="card flex min-h-32 flex-col justify-between gap-3 bg-linear-to-br to-transparent p-5" :class="GRADIENT_BY_CARD[card.id]">
    <h2 class="text-sm font-medium text-toned">{{ card.label }}</h2>
    <div class="flex flex-col gap-1">
      <p class="tabular font-display text-[1.75rem] leading-none font-bold text-highlighted">{{ card.value }}</p>
      <p v-if="card.note" class="tabular text-sm text-toned">{{ card.note }}</p>
    </div>
  </article>
</template>
