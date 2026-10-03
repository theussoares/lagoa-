<script setup lang="ts">
import type { ShopPreview } from '../types/discover'
import { previewGridStyle } from '../utils/slotGrid'

interface Props {
  preview: ShopPreview
  icon: string
  tilt: number
}

const props = defineProps<Props>()

const MIN_COLUMNS = 10
const slotGrid = computed(() => (props.preview.kind === 'slots' ? previewGridStyle(props.preview.total, MIN_COLUMNS) : undefined))
</script>

<template>
  <div aria-hidden="true">
    <ol v-if="preview.kind === 'slots'" class="grid max-w-[22rem] gap-1.5" :style="slotGrid">
      <li v-for="slot in preview.total" :key="slot" class="aspect-square">
        <StampImpression v-if="slot <= preview.welcome" :icon="icon" :tilt="tilt" />
        <span v-else class="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-(--lagoa-slot) text-muted">
          <UIcon v-if="slot === preview.total" name="i-ph-gift" class="size-[55%]" />
        </span>
      </li>
    </ol>
    <InkRule v-else :fraction="preview.fraction" class="max-w-[22rem]" />
  </div>
</template>
