<script setup lang="ts">
const { t } = useI18n()
const whatsappLink = useWhatsAppLink()

const INCLUDED = ['counter', 'modes', 'bonus', 'poster', 'customers', 'campaigns', 'discover'] as const
</script>

<template>
  <section id="preco" class="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :eyebrow="t('pricing.eyebrow')" :title="t('pricing.title')" align="center" />
    </div>

    <div v-reveal class="mx-auto mt-14 grid max-w-4xl overflow-hidden rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card) md:grid-cols-2">
      <div class="dark flex flex-col gap-6 bg-(--lagoa-header) p-8 text-default">
        <div class="flex items-center justify-between gap-3">
          <h3 class="type-card-title">{{ t('pricing.plan') }}</h3>
          <StampTag :label="t('pricing.locked')" icon="i-ph-lock-simple-bold" />
        </div>
        <p class="flex items-baseline gap-1 text-highlighted">
          <span class="font-display text-2xl font-bold">{{ t('pricing.currency') }}</span>
          <span class="font-display tabular text-[4.5rem] leading-none font-extrabold tracking-tight">{{ t('pricing.amount') }}</span>
          <span class="text-lg text-muted">{{ t('pricing.period') }}</span>
        </p>
        <p class="text-toned">{{ t('pricing.lockedNote') }}</p>
        <UButton :to="whatsappLink" target="_blank" size="xl" block trailing-icon="i-ph-whatsapp-logo" class="mt-auto">
          {{ t('cta.primary') }}
        </UButton>
        <p class="text-[0.9375rem] text-muted">{{ t('pricing.approval') }}</p>
      </div>

      <div class="flex flex-col gap-4 p-8">
        <p class="eyebrow-tag text-muted">{{ t('pricing.includedTitle') }}</p>
        <ul class="flex flex-col">
          <li v-for="item in INCLUDED" :key="item" class="flex items-start gap-3 border-b border-(--lagoa-rule) py-3 last:border-b-0">
            <UIcon name="i-ph-check-bold" class="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
            <span class="text-toned">{{ t(`pricing.included.${item}`) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
