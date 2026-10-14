<script setup lang="ts">
// Força o claro mesmo para quem tem "escuro" guardado pelo plugin de tema da layer ui.
definePageMeta({ colorMode: 'light' })

const { t } = useI18n()
const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: () => t('seo.title'),
  description: () => t('seo.description'),
  ogTitle: () => t('seo.title'),
  ogDescription: () => t('seo.description'),
  ogType: 'website',
  ogLocale: 'pt_BR',
  ogUrl: siteUrl || undefined,
  twitterCard: 'summary',
})

useHead({
  link: siteUrl ? [{ rel: 'canonical', href: siteUrl }] : [],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildHomeSchema(siteUrl, t('seo.title'), t('seo.description'))) }],
})
</script>

<template>
  <div>
    <HeroSection />
    <PainSection />
    <CounterSection />
    <LapsedSection />
    <BonusSection />
    <NetworkSection />
    <RoiSection />
    <PricingSection />
    <FaqSection />
    <ClosingSection />
  </div>
</template>
