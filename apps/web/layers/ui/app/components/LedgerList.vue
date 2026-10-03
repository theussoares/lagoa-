<script setup lang="ts">
import type { LedgerEntryModel } from '../types/wallet'

interface Props {
  entries: readonly LedgerEntryModel[]
}

const props = defineProps<Props>()

/** A caderneta chega do mais novo ao mais antigo: cada mês vira uma página. */
const pages = computed(() => {
  const result: { month: string; entries: LedgerEntryModel[] }[] = []
  for (const entry of props.entries) {
    const last = result.at(-1)
    if (last?.month === entry.month) last.entries.push(entry)
    else result.push({ month: entry.month, entries: [entry] })
  }
  return result
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <section v-for="page in pages" :key="page.month" :aria-label="page.month">
      <h3 class="pt-3 text-base font-semibold text-muted capitalize" aria-hidden="true">{{ page.month }}</h3>
      <ol class="flex flex-col">
        <li
          v-for="entry in page.entries"
          :key="entry.id"
          class="grid grid-cols-[2.75rem_1fr_auto] items-center gap-x-3 gap-y-0.5 border-b border-(--lagoa-rule) py-3 last:border-b-0"
        >
          <span class="row-span-2 size-11">
            <StampImpression :icon="entry.icon" :tilt="entry.tilt" :tone="entry.tone" />
          </span>
          <span class="min-w-0 text-balance font-medium text-highlighted">{{ entry.title }}</span>
          <span class="tabular text-right text-base font-semibold" :class="entry.tone === 'reward' ? 'text-secondary' : 'text-primary'">
            {{ entry.delta }}
          </span>
          <span class="col-span-2 text-base text-toned">
            <span class="tabular">{{ entry.when }}</span>
            <span aria-hidden="true"> · </span>
            <span>{{ entry.detail }}</span>
          </span>
        </li>
      </ol>
    </section>
  </div>
</template>
