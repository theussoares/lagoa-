<script setup lang="ts">
definePageMeta({
  path: '/premios',
  layout: 'customer',
  // Com a chave da fase B os Prêmios moram numa aba da Carteira; o link antigo vira redirecionamento permanente.
  middleware: [() => (useHitsEnabled() ? navigateTo(walletSectionPath('rewards'), { redirectCode: 301 }) : undefined), 'customer-auth'],
})

const { t } = useI18n()
useHead({ title: () => `${t('rewards.title')} · ${t('app.name')}` })
const screen = useRewardsScreen()
</script>

<template>
  <div class="flex flex-col gap-8">
    <ScreenHeader :title="t('rewards.title')" :image="screen.cityHeaderImage" :overlap="false" />
    <RewardsPanel :screen="screen" />
  </div>
</template>
