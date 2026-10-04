<script setup lang="ts">
import type { RankingRowModel } from '../../types/ranking'

interface Props {
  rows: RankingRowModel[]
  label: string
}

defineProps<Props>()
</script>

<template>
  <ol class="flex flex-col rounded-(--radius-card) bg-default px-4 shadow-(--lagoa-shadow-card)" :aria-label="label">
    <li
      v-for="(row, index) in rows"
      :key="row.position"
      class="rise flex items-center gap-3 border-b border-(--lagoa-rule) py-3 last:border-b-0"
      :class="row.isMe && 'font-semibold'"
      :style="{ '--i': index }"
    >
      <span class="font-display tabular w-8 shrink-0 text-[1.375rem] leading-none font-extrabold" :class="row.isMe ? 'text-primary' : 'text-toned'">{{ row.position }}º</span>
      <span class="min-w-0 flex-1 truncate text-lg text-highlighted">{{ row.name }}</span>
      <span class="tabular shrink-0 text-base text-muted">{{ row.visitsLabel }}</span>
    </li>
  </ol>
</template>
