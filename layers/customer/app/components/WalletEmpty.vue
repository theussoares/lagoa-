<script setup lang="ts">
import type { StampSlotModel } from '#layers/ui/app/types/wallet'

interface Props {
  title: string
  lead: string
  action: string
  to: string
}

defineProps<Props>()

const SLOTS = 10
const slots: StampSlotModel[] = Array.from({ length: SLOTS }, (_, index) => ({
  number: index + 1,
  stamped: false,
  isRewardSlot: index === SLOTS - 1,
  tilt: 0,
  fresh: false,
  delayMs: 0,
}))
</script>

<template>
  <div class="flex flex-col rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <ol class="grid grid-cols-5 gap-3 px-5 py-5" aria-hidden="true">
      <StampSlot v-for="slot in slots" :key="slot.number" :model="slot" icon="i-ph-storefront-bold" />
    </ol>
    <div class="flex flex-col gap-4 border-t border-(--lagoa-rule) px-5 pt-4 pb-5">
      <div class="flex flex-col gap-1">
        <h2 class="text-[1.375rem] leading-[1.2] font-semibold text-balance text-highlighted [font-stretch:95%]">{{ title }}</h2>
        <p class="text-pretty text-toned">{{ lead }}</p>
      </div>
      <UButton :to="to" size="xl" block icon="i-ph-compass" :label="action" />
    </div>
  </div>
</template>
