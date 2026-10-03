<script setup lang="ts">
import type { ChallengeModel } from '#layers/ui/app/types/discover'

const { t } = useI18n()

const STOPS = [
  { key: 'coffee', icon: 'i-ph-coffee-bold', visited: true, tilt: -4 },
  { key: 'pizza', icon: 'i-ph-pizza-bold', visited: false, tilt: 3 },
  { key: 'yours', icon: 'i-ph-storefront-bold', visited: false, tilt: -2 },
] as const

const challenge = computed<ChallengeModel>(() => ({
  id: 'landing-challenge',
  title: t('network.challengeTitle'),
  description: t('network.challengeBody'),
  deadline: null,
  progress: t('network.challengeProgress'),
  done: false,
  stops: STOPS.map((stop) => {
    const shop = t(`network.stops.${stop.key}`)
    return {
      id: stop.key,
      shopName: shop,
      icon: stop.icon,
      visited: stop.visited,
      tilt: stop.tilt,
      label: t(stop.visited ? 'network.stopVisited' : 'network.stopPending', { shop }),
    }
  }),
}))
</script>

<template>
  <section id="rede" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
      <div v-reveal>
        <SectionHeading :title="t('network.title')" :lead="t('network.lead')" />
      </div>
      <div v-reveal class="mx-auto w-full max-w-md">
        <ChallengeCard :challenge="challenge" :done-label="t('network.challengeDone')" />
      </div>
    </div>
  </section>
</template>
