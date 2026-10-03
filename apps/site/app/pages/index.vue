<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: () => t('seo.title'),
  description: () => t('seo.description'),
  ogTitle: () => t('seo.title'),
  ogDescription: () => t('seo.description'),
  ogType: 'website',
  ogLocale: 'pt_BR',
})
</script>

<template>
  <div>
    <SiteHeader />
    <main>
      <HeroSection />
      <ValuesSection />
      <HowSection />
      <BonusSection />
      <LapsedSection />
      <NetworkSection />
      <PricingSection />
      <FaqSection />
      <ClosingSection />
    </main>
    <SiteFooter />
  </div>
</template>
