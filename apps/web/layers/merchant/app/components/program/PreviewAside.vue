<script setup lang="ts">
import type { ProgramPreview } from '../../types/program'

interface Props {
  preview: ProgramPreview
  label: string
  title: string
  headingLevel: 'h2' | 'h3'
}

defineProps<Props>()
</script>

<template>
  <aside class="flex flex-col gap-3 lg:sticky lg:top-6 lg:col-span-5" :aria-label="label">
    <p class="letreiro text-[0.9375rem] text-toned">{{ title }}</p>
    <StampCard :card="preview.card" :heading-level="headingLevel" />
    <p class="flex items-center gap-1.5 text-[0.9375rem] text-toned">
      <UIcon name="i-ph-seal-check" class="size-4 shrink-0 text-primary" aria-hidden="true" />{{ preview.earnLine }}
    </p>
  </aside>
</template>
