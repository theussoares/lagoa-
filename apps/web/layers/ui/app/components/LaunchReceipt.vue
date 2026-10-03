<script setup lang="ts">
import type { LaunchReceiptModel } from '../types/counter'

interface Props {
  receipt: LaunchReceiptModel
  /** Ícone das impressões nas casas do cartão. */
  icon: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-3 rounded-(--ui-radius) bg-elevated p-4">
    <div class="flex items-start gap-2.5">
      <UIcon
        :name="receipt.tone === 'reward' ? 'i-ph-gift' : 'i-ph-check-circle'"
        class="mt-0.5 size-5 shrink-0"
        :class="receipt.tone === 'reward' ? 'text-secondary' : 'text-success'"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="font-semibold text-highlighted">{{ receipt.title }}</p>
        <p class="text-[0.9375rem] text-muted">{{ receipt.detail }}</p>
      </div>
    </div>
    <ol v-if="receipt.body.kind === 'slots'" class="grid grid-cols-10 gap-1.5" aria-hidden="true">
      <StampSlot v-for="slot in receipt.body.slots" :key="slot.number" :model="slot" :icon="icon" />
    </ol>
    <PointsRuler v-else :balance="receipt.body.balance" :target="receipt.body.target" :label="receipt.body.label" />
  </div>
</template>
