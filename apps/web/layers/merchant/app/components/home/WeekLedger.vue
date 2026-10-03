<script setup lang="ts">
import type { WeekDayRow } from '../../types/home'

interface Props {
  rows: readonly WeekDayRow[]
  caption: string
}

defineProps<Props>()
</script>

<template>
  <ol :aria-label="caption" class="flex flex-col divide-y divide-(--lagoa-rule)">
    <li v-for="row in rows" :key="row.isoDate" class="grid min-h-12 grid-cols-[8.5rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 py-2">
      <span class="text-[0.9375rem]" :class="row.isToday ? 'font-semibold text-highlighted' : 'text-toned'">{{ row.label }}</span>
      <span class="flex min-w-0 flex-col gap-1">
        <!-- Os risquinhos só reforçam o número escrito ao lado; não são o único sinal. -->
        <TallyMarks v-if="row.count > 0" :count="row.count" />
        <span v-else class="h-px w-8 bg-(--lagoa-slot)" aria-hidden="true" />
        <span v-if="row.detail" class="truncate text-sm text-muted">{{ row.detail }}</span>
      </span>
      <span class="tabular text-right text-[0.9375rem]" :class="row.isToday ? 'font-semibold text-highlighted' : 'text-default'">{{ row.visits }}</span>
    </li>
  </ol>
</template>
