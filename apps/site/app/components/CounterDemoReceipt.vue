<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import type { CounterDemoFocusTarget, CounterDemoReceiptModel } from '../types/counterDemo'
import type { FocusRequest } from '#layers/ui/app/types/focus'
import { slotGridStyle } from '#layers/ui/app/utils/slotGrid'
import { REWARD_STAMP_ICON } from '#layers/ui/app/utils/stampIcons'

interface Props {
  receipt: CounterDemoReceiptModel
  focusRequest: FocusRequest<CounterDemoFocusTarget> | null
}

interface Emits {
  restart: []
}

const SLOTS_PER_ROW = 10
const SLOT_GAP = '0.375rem'
const SHOP_ICON = 'i-ph-scissors-bold'

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()

const slotGrid = computed(() => (props.receipt.body.kind === 'slots' ? slotGridStyle(props.receipt.body.slots.length, SLOTS_PER_ROW, SLOT_GAP) : undefined))
const restartButton = useTemplateRef<ComponentPublicInstance>('restartButton')
useFocusTarget(() => props.focusRequest, 'restart', () => focusElement(restartButton.value))
</script>

<template>
  <div class="flex flex-col items-start gap-5">
    <RewardSeal v-if="receipt.tone === 'reward'" :label="t('counter.demo.seal')" pressed />
    <!-- Canhoto da leitura: a impressão grande bate primeiro, depois a casa do cartão recebe a mesma tinta. -->
    <div class="flex w-full flex-col gap-4 border-y border-dashed border-(--lagoa-slot)/60 py-4">
      <div class="flex items-center gap-4">
        <span class="size-16 shrink-0">
          <StampImpression :icon="receipt.tone === 'reward' ? REWARD_STAMP_ICON : SHOP_ICON" :tilt="receipt.tilt" :tone="receipt.tone" pressed />
        </span>
        <div class="flex min-w-0 flex-col gap-1">
          <p class="letreiro text-xl leading-[1.1]" :class="receipt.tone === 'reward' ? 'text-secondary' : 'text-highlighted'">{{ receipt.title }}</p>
          <p class="text-pretty text-[0.9375rem] text-toned">{{ receipt.detail }}</p>
        </div>
      </div>
      <ol v-if="receipt.body.kind === 'slots'" class="mx-auto grid" :style="slotGrid" aria-hidden="true">
        <StampSlot v-for="slot in receipt.body.slots" :key="slot.number" :model="slot" :icon="SHOP_ICON" />
      </ol>
      <PointsRuler v-else :balance="receipt.body.balance" :target="receipt.body.target" :label="receipt.body.label" />
    </div>
    <UButton ref="restartButton" size="xl" block color="neutral" variant="outline" icon="i-ph-arrow-counter-clockwise" @click="emit('restart')">
      {{ t('counter.demo.restart') }}
    </UButton>
  </div>
</template>
