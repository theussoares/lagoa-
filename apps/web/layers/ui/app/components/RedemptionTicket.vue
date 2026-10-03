<script setup lang="ts">
import type { RedemptionTicketState } from '../types/redemption'

interface Props {
  shopName: string
  icon: string
  reward: string
  codeLabel: string
  state: RedemptionTicketState
}

defineProps<Props>()

const titleId = useId()
</script>

<template>
  <section :aria-labelledby="titleId" class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex items-center gap-4 px-5 pt-5 pb-5">
      <span class="size-12 shrink-0">
        <StampImpression :icon="icon" :tilt="-5" tone="reward" />
      </span>
      <div class="min-w-0">
        <p class="letreiro truncate text-[1.0625rem] text-toned">{{ shopName }}</p>
        <h2 :id="titleId" class="text-[1.375rem] leading-tight font-semibold text-balance text-highlighted [font-stretch:95%]">
          {{ reward }}
        </h2>
      </div>
    </header>

    <StubPerforation />

    <div class="flex flex-col gap-4 px-5 pt-5 pb-6">
      <template v-if="state.kind === 'redeemed'">
        <div class="flex min-h-[7.5rem] items-center justify-center">
          <RewardSeal :label="state.seal" :tilt="-6" pressed />
        </div>
        <p class="text-center text-pretty text-toned" role="status">{{ state.note }}</p>
      </template>

      <template v-else>
        <RedemptionTicketCode :code="state.code" :code-label="codeLabel" :active="state.kind === 'active'" />

        <RedemptionTicketTimer
          v-if="state.kind === 'active'"
          :clock="state.clock"
          :clock-label="state.clockLabel"
          :urgent="state.urgent"
          :remaining-fraction="state.remainingFraction"
        />

        <p v-else class="flex items-start justify-center gap-1.5 text-center text-pretty text-warning">
          <UIcon name="i-ph-warning-circle" class="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <span>{{ state.note }}</span>
        </p>
      </template>

      <slot />
    </div>
  </section>
</template>
