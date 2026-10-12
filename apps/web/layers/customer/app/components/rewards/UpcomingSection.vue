<script setup lang="ts">
import type { UpcomingRewardModel } from '#layers/ui/app/types/rewards'

interface Props {
  rewards: readonly UpcomingRewardModel[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="upcoming-title">
    <h2 id="upcoming-title" class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">
      {{ t('rewards.upcomingTitle') }}
    </h2>
    <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
      <RewardProgressList :rewards="rewards" />
    </div>
  </section>
</template>
