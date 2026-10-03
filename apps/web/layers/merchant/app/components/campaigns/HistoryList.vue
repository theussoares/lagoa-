<script setup lang="ts">
import type { CampaignHistoryRow } from '../../types/campaign'

interface Props {
  rows: readonly CampaignHistoryRow[]
  emptyText: string
  caption: string
}

defineProps<Props>()
</script>

<template>
  <p v-if="rows.length === 0" class="py-4 text-center text-muted">{{ emptyText }}</p>
  <ul v-else :aria-label="caption" class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="row in rows" :key="row.id" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <p class="flex flex-wrap items-baseline gap-x-2 text-[0.9375rem]">
        <span class="tabular font-semibold text-highlighted">{{ row.sentAt }}</span>
        <span class="tabular text-toned">{{ row.recipients }} · {{ row.bonus }}</span>
      </p>
      <p class="line-clamp-2 text-sm break-words text-muted">{{ row.message }}</p>
    </li>
  </ul>
</template>
