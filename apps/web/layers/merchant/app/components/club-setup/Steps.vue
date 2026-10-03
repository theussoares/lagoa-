<script setup lang="ts">
import type { SetupStepItem } from '../../types/clubSetup'

interface Props {
  steps: readonly SetupStepItem[]
  label: string
  doneLabel: string
}

defineProps<Props>()
</script>

<template>
  <ol :aria-label="label" class="flex flex-wrap items-center gap-1.5">
    <li
      v-for="(item, index) in steps"
      :key="item.key"
      :aria-current="item.state === 'current' ? 'step' : undefined"
      class="flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-sm font-semibold"
      :class="item.state === 'current' ? 'bg-primary/10 text-highlighted' : item.state === 'done' ? 'text-highlighted' : 'text-muted'"
    >
      <span
        class="flex size-6 items-center justify-center rounded-full text-xs"
        :class="item.state === 'next' ? 'bg-(--lagoa-rule) text-muted' : 'bg-primary text-inverted'"
      >
        <UIcon v-if="item.state === 'done'" name="i-ph-check-bold" class="size-3.5" aria-hidden="true" />
        <span v-else class="tabular" aria-hidden="true">{{ index + 1 }}</span>
      </span>
      {{ item.label }}
      <span v-if="item.state === 'done'" class="sr-only">({{ doneLabel }})</span>
    </li>
  </ol>
</template>
