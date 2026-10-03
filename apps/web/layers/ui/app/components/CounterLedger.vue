<script setup lang="ts">
import type { CounterLedgerEntryModel } from '../types/counter'

interface Props {
  entries: readonly CounterLedgerEntryModel[]
}

defineProps<Props>()
</script>

<template>
  <ol class="flex flex-col">
    <TransitionGroup name="ledger-row">
      <li
        v-for="entry in entries"
        :key="entry.id"
        class="grid min-h-14 grid-cols-[3.25rem_minmax(0,1fr)_auto_2.5rem] items-center gap-x-4 border-b border-(--lagoa-rule) py-2 text-[0.9375rem] last:border-b-0"
      >
        <span class="tabular text-muted">{{ entry.time }}</span>
        <span class="flex min-w-0 items-center gap-2">
          <span class="tabular font-semibold whitespace-nowrap text-highlighted">{{ entry.phone }}</span>
          <UBadge v-if="entry.badge" :label="entry.badge" color="success" variant="subtle" size="sm" class="shrink-0" />
        </span>
        <span class="tabular text-right font-semibold" :class="entry.tone === 'reward' ? 'text-secondary' : 'text-primary'">
          {{ entry.action }}
        </span>
        <span class="size-9 justify-self-end">
          <StampImpression :icon="entry.icon" :tilt="entry.tilt" :tone="entry.tone" :pressed="entry.fresh" :delay-ms="120" />
        </span>
      </li>
    </TransitionGroup>
  </ol>
</template>

<style scoped>
/* A linha nova abre espaço no topo; a impressão bate logo depois (stamp-press). */
.ledger-row-enter-active {
  transition:
    opacity var(--lagoa-dur-base) var(--ease-out-expo),
    transform var(--lagoa-dur-base) var(--ease-out-expo);
}
.ledger-row-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.ledger-row-move {
  transition: transform var(--lagoa-dur-base) var(--ease-out-expo);
}

@media (prefers-reduced-motion: reduce) {
  .ledger-row-enter-active,
  .ledger-row-move {
    transition: none;
  }
}
</style>
