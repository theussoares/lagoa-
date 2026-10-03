<script setup lang="ts">
import type { CustomerRowModel } from '../../types/customer'
import type { LapsedPreviewLabels } from '../../utils/homeModels'

interface Props {
  rows: readonly CustomerRowModel[]
  labels: LapsedPreviewLabels
}

defineProps<Props>()
</script>

<template>
  <ul :aria-label="labels.caption" class="flex flex-col divide-y divide-(--lagoa-rule) border-y border-(--lagoa-rule)">
    <li v-for="row in rows" :key="row.id" class="flex min-h-14 items-center justify-between gap-3 py-2">
      <span class="flex min-w-0 flex-col">
        <span class="truncate font-semibold text-highlighted">{{ row.name ?? labels.noName }}</span>
        <span class="tabular text-sm text-muted">{{ row.phone }} · {{ row.lastVisit }}</span>
      </span>
      <span class="tabular shrink-0 text-sm text-toned">{{ row.progress }}</span>
    </li>
  </ul>
</template>
