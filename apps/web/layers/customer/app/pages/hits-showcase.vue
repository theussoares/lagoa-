<script setup lang="ts">
definePageMeta({
  path: '/vitrine',
  layout: 'customer',
  // Sem a chave da fase B a vitrine não existe: 404, não um redirecionamento.
  middleware: [() => (useHitsEnabled() ? undefined : createError({ statusCode: 404, fatal: true })), 'customer-auth'],
})

const { t } = useI18n()
useHead({ title: () => `${t('hits.title')} · ${t('app.name')}` })
const screen = useCustomerHitsScreen()
</script>

<template>
  <div class="flex flex-col gap-6">
    <ScreenHeader :title="t('hits.title')" :lead="t('hits.lead')" :image="screen.cityHeaderImage" :overlap="false" />
    <HitsBannerCarousel v-if="screen.banners.length > 0" :banners="screen.banners" />
    <DiscoverGroupChips v-model:selected="screen.group" />
    <div v-if="screen.loading" class="grid grid-cols-2 gap-3" role="status" :aria-label="t('common.loading')">
      <USkeleton v-for="slot in 4" :key="slot" class="h-72 rounded-(--radius-card)" />
    </div>
    <WalletProblem v-else-if="screen.errorCode" :message="t(`errors.${screen.errorCode}`)" :action="t('common.retry')" @retry="screen.reload" />
    <HitsEmpty v-else-if="screen.empty" :message="t('hits.empty')" />
    <HitsEmpty v-else-if="screen.groupEmpty" :message="t('hits.groupEmpty')" />
    <HitsItemGrid
      v-else
      :items="screen.items"
      :can-load-more="screen.canLoadMore"
      :loading-more="screen.loadingMore"
      :more-error="screen.moreError ? t(`errors.${screen.moreError}`) : null"
      @load-more="screen.loadMore"
    />
  </div>
</template>
