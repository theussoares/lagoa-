<script setup lang="ts">
definePageMeta({
  path: '/painel',
  alias: ['/campanhas'],
  layout: 'merchant',
  middleware: 'merchant-auth',
})

const { t } = useI18n()
useHead({ title: () => `${t('merchantUpcoming.title')} · ${t('app.name')}` })
</script>

<template>
  <section class="flex max-w-xl flex-col items-start gap-3 pt-6">
    <h1 class="text-[1.75rem] leading-tight font-bold text-highlighted [font-stretch:90%]">{{ t('merchantUpcoming.title') }}</h1>
    <p class="text-toned">{{ t('merchantUpcoming.lead') }}</p>
    <UButton to="/balcao" icon="i-ph-storefront" :label="t('merchantUpcoming.back')" class="mt-2" />
  </section>
</template>
