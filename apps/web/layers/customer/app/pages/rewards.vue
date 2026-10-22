<script setup lang="ts">
definePageMeta({
  path: '/premios',
  layout: 'customer',
  // Com a chave da fase B os Prêmios moram numa aba da Carteira. 302, não 301: o navegador guarda o 301 e,
  // com a chave desligada de novo, a pessoa não chegaria mais à página Prêmios.
  middleware: [() => (useHitsEnabled() ? navigateTo(walletSectionPath('rewards'), { redirectCode: 302 }) : undefined), 'customer-auth'],
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
