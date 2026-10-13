<script setup lang="ts">
import type { ReadyRewardModel } from '#layers/ui/app/types/rewards'

interface Props {
  rewards: readonly ReadyRewardModel[]
  /** Frase do cartão mais perto do prêmio, para quando nada está pronto. */
  closest: string | null
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="ready-title">
    <h2 id="ready-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
      {{ t('rewards.readyTitle') }}
    </h2>
    <ul v-if="rewards.length > 0" class="flex flex-col gap-4">
      <li v-for="reward in rewards" :key="reward.id">
        <RewardCoupon :reward="reward" :action="t('rewards.redeem')" />
      </li>
    </ul>
    <div v-else class="flex flex-col gap-1 rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4">
      <p class="font-medium text-highlighted">{{ t('rewards.noneReady') }}</p>
      <p v-if="closest" class="text-pretty text-toned">{{ closest }}</p>
    </div>
  </section>
</template>
