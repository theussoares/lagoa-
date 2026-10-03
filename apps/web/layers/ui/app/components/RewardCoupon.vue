<script setup lang="ts">
import type { ReadyRewardModel } from '../types/rewards'

interface Props {
  reward: ReadyRewardModel
  /** "Resgatar" */
  action: string
}

defineProps<Props>()
</script>

<template>
  <!-- O canhoto inteiro é o link: o alvo de toque é o prêmio, não um botão escondido no canto. -->
  <NuxtLink
    :to="reward.to"
    class="group block rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card) transition-transform duration-(--lagoa-dur-fast) active:scale-[0.99]"
  >
    <div class="flex items-center gap-4 p-5">
      <span class="size-14 shrink-0">
        <StampImpression :icon="reward.icon" :tilt="reward.tilt" tone="reward" />
      </span>
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="letreiro truncate text-[1.0625rem] text-toned">{{ reward.shopName }}</p>
        <h3 class="text-[1.375rem] leading-tight font-semibold text-balance text-highlighted [font-stretch:95%]">
          {{ reward.reward }}
        </h3>
        <p v-if="reward.note" class="text-base text-muted">{{ reward.note }}</p>
      </div>
    </div>

    <StubPerforation />

    <span class="flex min-h-14 items-center justify-between px-5 font-semibold text-secondary">
      {{ action }}
      <UIcon
        name="i-ph-arrow-right"
        class="size-5 transition-transform duration-(--lagoa-dur-fast) group-hover:translate-x-1"
        aria-hidden="true"
      />
    </span>
  </NuxtLink>
</template>
