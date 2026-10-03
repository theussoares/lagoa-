<script setup lang="ts">
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
})
</script>

<template>
  <div>
    <SiteHeader />
    <main>
      <HeroSection />
      <LapsedSection />
      <CounterSection />
      <HowSection />
      <BonusSection />
      <NetworkSection />
      <PricingSection />
      <FaqSection />
      <ClosingSection />
    </main>
    <SiteFooter />
  </div>
</template>
