<script setup lang="ts">
import type { StampSlotModel } from '#layers/ui/app/types/wallet'

interface Props {
  brand: string
  title: string
  /** Os três passos do Balcão, já traduzidos. */
  steps: readonly [string, string, string]
}

const props = defineProps<Props>()

const STEP_DELAY_MS = 380
const STEP_TILTS = [-4, 3, -2] as const

// As casas chegam vazias e recebem o carimbo uma a uma: o Balcão contado pelo próprio gesto.
const stamped = ref(false)
onMounted(() => requestAnimationFrame(() => (stamped.value = true)))

const slots = computed(() =>
  props.steps.map((text, index): { text: string; slot: StampSlotModel } => ({
    text,
    slot: {
      number: index + 1,
      stamped: stamped.value,
      isRewardSlot: false,
      tilt: STEP_TILTS[index] ?? 0,
      fresh: true,
      delayMs: 300 + index * STEP_DELAY_MS,
    },
  })),
)
</script>

<template>
  <aside class="dark hidden flex-col justify-between bg-default px-12 py-12 text-default lg:flex">
    <p class="letreiro text-2xl text-highlighted">{{ brand }}</p>
    <div class="flex flex-col gap-10">
      <h2 class="max-w-[16ch] text-[2.5rem] leading-[1.08] font-bold text-balance text-highlighted [font-stretch:85%]">
        {{ title }}
      </h2>
      <ol class="flex flex-col gap-5">
        <li v-for="item in slots" :key="item.slot.number" class="flex items-center gap-4">
          <ol class="size-12 shrink-0" aria-hidden="true">
            <StampSlot :model="item.slot" icon="i-ph-check-fat-bold" />
          </ol>
          <span class="text-lg text-toned">{{ item.text }}</span>
        </li>
      </ol>
    </div>
    <span aria-hidden="true" />
  </aside>
</template>
