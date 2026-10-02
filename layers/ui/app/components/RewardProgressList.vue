<script setup lang="ts">
import type { UpcomingRewardModel } from '../types/rewards'

interface Props {
  rewards: readonly UpcomingRewardModel[]
}

defineProps<Props>()
</script>

<template>
  <ol class="flex flex-col">
    <li
      v-for="item in rewards"
      :key="item.id"
      class="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-(--lagoa-rule) py-4 last:border-b-0"
    >
      <span class="sr-only">{{ item.summary }}</span>

      <span class="size-11" aria-hidden="true">
        <StampImpression :icon="item.icon" :tilt="item.tilt" />
      </span>
      <span class="flex min-w-0 flex-col" aria-hidden="true">
        <span class="letreiro truncate text-base text-toned">{{ item.shopName }}</span>
        <span class="font-medium text-pretty text-highlighted">{{ item.reward }}</span>
      </span>
      <span class="flex flex-col items-end" aria-hidden="true">
        <span class="tabular text-[2rem] leading-none font-extrabold text-primary [font-stretch:75%]">{{ item.count }}</span>
        <span class="text-sm font-medium text-muted">{{ item.countLabel }}</span>
      </span>

      <span class="col-span-full flex flex-col gap-2" aria-hidden="true">
        <SlotRow v-if="item.progress.kind === 'slots'" :filled="item.progress.filled" :total="item.progress.total" />
        <InkRule v-else :fraction="item.progress.fraction" />
        <span class="tabular text-base text-muted">{{ item.progressLabel }}</span>
      </span>
    </li>
  </ol>
</template>
