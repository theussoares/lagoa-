<script setup lang="ts">
import type { ReachModel } from '../../types/campaign'

interface Props {
  model: ReachModel
  privacyNote: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="tabular text-xl font-bold text-highlighted">{{ model.headline }}</p>
    <ul class="flex flex-col divide-y divide-(--lagoa-rule) border-y border-(--lagoa-rule)">
      <li v-for="line in model.lines" :key="line.key" class="flex min-h-11 items-center gap-2 py-2 text-[0.9375rem] text-toned">
        <UIcon :name="line.icon" class="size-5 shrink-0 text-muted" aria-hidden="true" />
        <span class="tabular">{{ line.text }}</span>
      </li>
    </ul>
    <p v-if="model.emptyHint" class="text-[0.9375rem] text-muted">{{ model.emptyHint }}</p>
    <p class="flex items-start gap-1.5 text-sm text-muted">
      <UIcon name="i-ph-lock-simple" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ privacyNote }}
    </p>
  </div>
</template>
