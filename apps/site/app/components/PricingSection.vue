<script setup lang="ts">
const { t } = useI18n()

const FOUNDER_ITEMS = ['retention', 'slowDay', 'newCustomers', 'setup'] as const
const PRO_ITEMS = ['lapsed', 'campaigns', 'spotlight'] as const
</script>

<template>
  <section id="preco" class="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :title="t('pricing.title')" align="center" />
      <p class="mx-auto mt-4 max-w-2xl text-center text-[0.9375rem] text-toned">{{ t('pricing.paybackNote') }}</p>
      <p class="mx-auto mt-4 max-w-2xl text-center text-[0.9375rem] font-semibold text-highlighted">{{ t('pricing.scarcity', COPY_PARAMS) }}</p>
    </div>

    <div v-reveal class="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
      <PricingPlanCard plan="founder" :items="FOUNDER_ITEMS" message="whatsappMessageFounder" />
      <PricingPlanCard plan="pro" :items="PRO_ITEMS" featured show-inherited-lead message="whatsappMessagePro" />
    </div>

    <div v-reveal class="mx-auto mt-8 flex max-w-4xl flex-col gap-6">
      <PricingRiskStrip />
      <p class="text-center text-[0.9375rem] text-toned">{{ t('pricing.approval') }}</p>
    </div>
  </section>
</template>
