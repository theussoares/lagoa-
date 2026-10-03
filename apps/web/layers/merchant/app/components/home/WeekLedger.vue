<script setup lang="ts">
import type { WeekDayRow } from '../../utils/homeModels'

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
        <!-- A régua só reforça o número escrito ao lado; não é o único sinal. -->
        <span class="h-2 overflow-hidden rounded-full bg-(--lagoa-rule)" aria-hidden="true">
          <span class="block h-full rounded-full bg-primary" :style="{ width: `${Math.round(row.ratio * 100)}%` }" />
        </span>
        <span v-if="row.detail" class="truncate text-sm text-muted">{{ row.detail }}</span>
      </span>
      <span class="tabular text-right text-[0.9375rem]" :class="row.isToday ? 'font-semibold text-highlighted' : 'text-default'">{{ row.visits }}</span>
    </li>
  </ol>
</template>
