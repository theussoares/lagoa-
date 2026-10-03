<script setup lang="ts">
import type { UpcomingRewardModel } from '../types/rewards'

interface Props {
  rewards: readonly UpcomingRewardModel[]
}

defineProps<Props>()

const RAIL_STAGGER_MS = 60
</script>

<template>
  <ol class="flex flex-col">
    <li
      v-for="(item, index) in rewards"
      :key="item.id"
      class="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-(--lagoa-rule) py-4 last:border-b-0"
    >
      <span class="sr-only">{{ item.summary }}</span>

      <span class="size-11" aria-hidden="true">
        <StampImpression :icon="item.icon" :tilt="item.tilt" />
      </span>
      <span class="flex min-w-0 flex-col" aria-hidden="true">
        <span class="letreiro truncate text-[0.9375rem] text-toned">{{ item.shopName }}</span>
        <span class="font-medium text-pretty text-highlighted">{{ item.reward }}</span>
      </span>
      <span class="flex flex-col items-end" aria-hidden="true">
        <span class="tabular text-[2rem] leading-none font-extrabold text-primary [font-stretch:75%]">{{ item.count }}</span>
        <span class="text-[0.8125rem] font-medium text-muted">{{ item.countLabel }}</span>
      </span>

      <span class="col-span-full flex flex-col gap-1.5" aria-hidden="true">
        <span class="block h-1.5 overflow-hidden rounded-full bg-(--lagoa-rule)">
          <span
            class="rail-fill block h-full origin-left rounded-full bg-primary"
            :style="{ transform: `scaleX(${item.fraction})`, animationDelay: `${index * RAIL_STAGGER_MS}ms` }"
          />
        </span>
        <span class="tabular text-[0.9375rem] text-muted">{{ item.progressLabel }}</span>
      </span>
    </li>
  </ol>
</template>

<style scoped>
.rail-fill {
  animation: rail-ink var(--lagoa-dur-stamp) var(--ease-out-expo) both;
}

@keyframes rail-ink {
  from { transform: scaleX(0); }
}

@media (prefers-reduced-motion: reduce) {
  .rail-fill { animation: none; }
}
</style>
