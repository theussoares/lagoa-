<script setup lang="ts">
import type { ShopShowcaseModel } from '../types/discover'

interface Props {
  showcase: ShopShowcaseModel
  icon: string
  tag: string | null
}

defineProps<Props>()
</script>

<template>
  <div class="relative h-36 bg-(--color-tinta-100) dark:bg-(--color-tinta-900)" aria-hidden="true">
    <img v-if="showcase.image" :src="showcase.image" alt="" class="absolute inset-0 size-full object-cover" />
    <UIcon v-else :name="icon" class="absolute -right-2 -bottom-4 size-28 text-primary opacity-15" />
    <span
      v-if="showcase.openLabel"
      class="eyebrow-tag absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-(--color-lima-100) px-3 py-1.5 text-(--color-lima-900) ring-4 ring-white"
    >
      <span class="live-dot size-2 rounded-full bg-(--color-lima-500)" />
      {{ showcase.openLabel }}
    </span>
    <StampTag v-if="tag" :label="tag" icon="i-ph-flag-pennant" class="absolute top-3 left-3 bg-default" />
  </div>
</template>
