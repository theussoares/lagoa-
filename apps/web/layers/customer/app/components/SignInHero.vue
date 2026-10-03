<script setup lang="ts">
import type { StampSlotModel } from '#layers/ui/app/types/wallet'

interface Props {
  brand: string
  caption: string
}

defineProps<Props>()

/** Três ramos diferentes no mesmo cartão: a rede, não uma loja. */
const PRESSED = [
  { icon: 'i-ph-scissors-bold', tilt: -5 },
  { icon: 'i-ph-coffee-bold', tilt: 4 },
  { icon: 'i-ph-pizza-bold', tilt: -2 },
] as const
const SLOTS = 10
const STAGGER_MS = 260
const FIRST_DELAY_MS = 220

const slots: StampSlotModel[] = Array.from({ length: SLOTS }, (_, index) => ({
  number: index + 1,
  stamped: index < PRESSED.length,
  isRewardSlot: index === SLOTS - 1,
  tilt: PRESSED[index]?.tilt ?? 0,
  fresh: index < PRESSED.length,
  delayMs: FIRST_DELAY_MS + index * STAGGER_MS,
}))
</script>

<template>
  <figure class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <p class="letreiro px-5 pt-4 pb-3 text-[1.25rem] text-highlighted">{{ brand }}</p>
    <ol class="grid grid-cols-5 gap-3 border-t border-(--lagoa-rule) px-5 py-4" aria-hidden="true">
      <StampSlot
        v-for="slot in slots"
        :key="slot.number"
        :model="slot"
        :icon="PRESSED[slot.number - 1]?.icon ?? 'i-ph-storefront-bold'"
      />
    </ol>
    <figcaption class="border-t border-(--lagoa-rule) px-5 py-3 text-base text-muted">{{ caption }}</figcaption>
  </figure>
</template>
