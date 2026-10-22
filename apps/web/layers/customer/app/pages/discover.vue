<script setup lang="ts">
definePageMeta({ path: '/descobrir', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('discover.title')} · ${t('app.name')}` })
const screen = useDiscoverScreen()
</script>

<template>
  <div>
    <DiscoverHeader v-model:query="screen.query" :image="screen.cityHeaderImage" :map-url="screen.mapUrl" :overlap="screen.headerOverlap" />
    <DiscoverFeaturedCarousel v-if="screen.featured.length > 0" :shops="screen.featured" />
    <HeroCard
      v-if="!screen.loading && screen.heroChallenge && !screen.searching"
      :badge="t('discover.challengeBadge')"
      :title="screen.heroChallenge.title"
      :description="screen.heroChallenge.description"
      :progress="screen.heroChallenge.progress"
      :filled="screen.heroChallenge.stops.filter((stop) => stop.visited).length"
      :total="screen.heroChallenge.stops.length"
      :note="screen.heroChallenge.deadline"
      icon="i-ph-map-pin-area"
    />
    <div class="flex flex-col gap-8 pt-8">
      <div v-if="screen.loading" class="flex flex-col gap-4" role="status" :aria-label="t('common.loading')">
        <USkeleton class="h-52 rounded-(--radius-card)" />
        <USkeleton class="h-64 rounded-(--radius-card)" />
      </div>

      <WalletProblem
        v-else-if="screen.shopsState.status === 'error'"
        :message="t(`errors.${screen.shopsState.error.code}`)"
        :action="t('common.retry')"
        @retry="screen.reloadShops"
      />

      <p v-else-if="screen.shopCount === 0" class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-toned">
        {{ t('discover.empty') }}
      </p>

      <template v-else>
        <DiscoverGroupChips v-if="screen.showGroups" v-model:selected="screen.group" />
        <p v-if="screen.groupEmpty" class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned">
          {{ t('discover.groupEmpty') }}
        </p>
        <DiscoverRail v-for="rail in screen.rails" :key="rail.id" :title="rail.title" :lead="rail.lead" :shops="rail.cards" />
        <DiscoverChallengeList v-if="screen.otherChallenges.length > 0 && !screen.searching" :challenges="screen.otherChallenges" />
        <DiscoverFreshShops v-if="screen.showFresh" :shops="screen.fresh" :searching="screen.searching" />
        <DiscoverKnownShops v-if="screen.known.length > 0" :shops="screen.known" />
      </template>
    </div>
  </div>
</template>
