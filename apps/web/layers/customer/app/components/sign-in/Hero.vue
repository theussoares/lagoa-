<script setup lang="ts">
import type { StampSlotModel } from '#layers/ui/app/types/wallet'

interface Props {
  brand: string
  city: string
  title: string
  lead: string
  caption: string
  image: string
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
  <div class="flex flex-col">
    <!-- Sangra até a borda do layout; a foto é a cidade, o véu garante o texto branco. -->
    <header
      class="relative -mx-5 -mt-[max(env(safe-area-inset-top),1.25rem)] overflow-hidden rounded-b-(--radius-header) bg-(--lagoa-header) px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-16 text-white"
    >
      <img :src="image" alt="" width="920" height="613" fetchpriority="high" class="slow-pan absolute inset-x-0 top-[-70%] h-[170%] w-full object-cover object-[50%_62%]" />
      <div class="absolute inset-0 bg-(image:--lagoa-scrim)" aria-hidden="true" />
      <div class="relative flex flex-col gap-5 pt-3">
        <div class="flex items-center justify-between gap-3">
          <p class="font-display text-[1.75rem] leading-none font-bold">{{ brand }}</p>
          <p class="type-tag flex items-center gap-1.5 rounded-full bg-(--lagoa-header)/60 py-1.5 pr-3 pl-2.5 text-white">
            <UIcon name="i-ph-map-pin" class="size-4" aria-hidden="true" />{{ city }}
          </p>
        </div>
        <div class="flex flex-col gap-2">
          <h1 class="font-display text-[2.25rem] leading-[1.02] font-bold text-balance">{{ title }}</h1>
          <p class="max-w-[32ch] text-pretty text-white/90">{{ lead }}</p>
        </div>
      </div>
    </header>

    <!-- O cartão sobe sobre a faixa: o que a pessoa ganha ao entrar. -->
    <figure class="card-raised relative -mt-10">
      <ol class="grid grid-cols-5 gap-3 px-5 py-4" aria-hidden="true">
        <StampSlot
          v-for="slot in slots"
          :key="slot.number"
          :model="slot"
          :icon="PRESSED[slot.number - 1]?.icon ?? 'i-ph-storefront-bold'"
        />
      </ol>
      <figcaption class="border-t border-(--lagoa-rule) px-5 py-3 text-base text-muted">{{ caption }}</figcaption>
    </figure>
  </div>
</template>
