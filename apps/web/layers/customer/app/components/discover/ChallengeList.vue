<script setup lang="ts">
import type { ChallengeModel } from '#layers/ui/app/types/discover'

interface Props {
  challenges: readonly ChallengeModel[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="challenges-title">
    <h2 id="challenges-title" class="type-h2">
      {{ t('discover.challengesTitle', {}, challenges.length) }}
    </h2>
    <ChallengeCard v-for="challenge in challenges" :key="challenge.id" :challenge="challenge" :done-label="t('discover.challenge.done')" />
  </section>
</template>
