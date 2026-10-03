<script setup lang="ts">
import type { LedgerEntryModel } from '../types/wallet'

interface Props {
  entries: readonly LedgerEntryModel[]
}

defineProps<Props>()
</script>

<template>
  <ol class="flex flex-col">
    <li
      v-for="entry in entries"
      :key="entry.id"
      class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 border-b border-(--lagoa-rule) py-3 last:border-b-0"
    >
      <span class="min-w-0 font-medium text-highlighted">{{ entry.title }}</span>
      <span
        class="tabular text-right text-base font-semibold"
        :class="entry.tone === 'reward' ? 'text-secondary' : 'text-primary'"
      >
        {{ entry.delta }}
      </span>
      <span class="col-span-2 text-base text-muted">
        <span class="tabular">{{ entry.when }}</span>
        <span aria-hidden="true"> · </span>
        <span>{{ entry.detail }}</span>
      </span>
    </li>
  </ol>
</template>
