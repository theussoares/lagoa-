<script setup lang="ts">
import type { StampSlotModel } from '../types/wallet'

interface Props {
  model: StampSlotModel
  icon: string
}

defineProps<Props>()
</script>

<template>
  <li class="relative aspect-square">
    <StampImpression
      v-if="model.stamped"
      :icon="icon"
      :tilt="model.tilt"
      :pressed="model.fresh"
      :delay-ms="model.delayMs"
    />
    <span
      v-else
      class="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-(--lagoa-slot) text-muted"
      aria-hidden="true"
    >
      <UIcon v-if="model.isRewardSlot" name="i-ph-gift" class="size-[42%]" />
      <span v-else class="tabular text-[0.8125rem] font-semibold [font-stretch:75%]">
        {{ String(model.number).padStart(2, '0') }}
      </span>
    </span>
  </li>
</template>
