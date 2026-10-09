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
})
</script>

<template>
  <div>
    <a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-full focus:bg-default focus:px-5 focus:py-3 focus:font-medium focus:text-highlighted focus:shadow-(--lagoa-shadow-card)">
      {{ $t('nav.skip') }}
    </a>
    <SiteHeader />
    <main id="conteudo" tabindex="-1" class="outline-none">
      <HeroSection />
      <CounterSection />
      <LapsedSection />
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
