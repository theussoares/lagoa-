<script setup lang="ts">
import type { LaunchReceiptModel } from '../types/counter'
import { slotGridStyle } from '../utils/slotGrid'
import { REWARD_STAMP_ICON } from '../utils/stampIcons'

interface Props {
  receipt: LaunchReceiptModel
  /** Ícone das impressões nas casas do cartão. */
  icon: string
}

const props = defineProps<Props>()

const SLOTS_PER_ROW = 10
const SLOT_GAP = '0.375rem'
const slotGrid = computed(() => (props.receipt.body.kind === 'slots' ? slotGridStyle(props.receipt.body.slots.length, SLOTS_PER_ROW, SLOT_GAP) : undefined))
</script>

<template>
  <!-- Canhoto do lançamento: a impressão grande bate primeiro, depois a casa do cartão recebe a mesma tinta. -->
  <div class="flex flex-col gap-4 border-y border-dashed border-(--lagoa-slot)/60 py-4">
    <div class="flex items-center gap-4">
      <span class="size-16 shrink-0">
        <StampImpression
          :icon="receipt.tone === 'reward' ? REWARD_STAMP_ICON : icon"
          :tilt="receipt.tilt"
          :tone="receipt.tone"
          pressed
        />
      </span>
      <div class="flex min-w-0 flex-col gap-1">
        <p class="letreiro text-xl leading-[1.1]" :class="receipt.tone === 'reward' ? 'text-secondary' : 'text-highlighted'">
          {{ receipt.title }}
        </p>
        <p class="text-pretty text-[0.9375rem] text-toned">{{ receipt.detail }}</p>
      </div>
    </div>
    <ol v-if="receipt.body.kind === 'slots'" class="mx-auto grid" :style="slotGrid" aria-hidden="true">
      <StampSlot v-for="slot in receipt.body.slots" :key="slot.number" :model="slot" :icon="icon" />
    </ol>
    <PointsRuler v-else :balance="receipt.body.balance" :target="receipt.body.target" :label="receipt.body.label" />
  </div>
</template>
