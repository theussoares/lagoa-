<script setup lang="ts">
const { t } = useI18n()
const whatsappLink = useWhatsAppLink()
</script>

<template>
  <section class="px-4 pb-6 sm:px-6">
    <div v-reveal class="dark mx-auto flex max-w-6xl flex-col items-center gap-7 rounded-(--radius-card) bg-(--lagoa-header) px-6 py-20 text-center text-default sm:py-24">
      <span class="size-20">
        <StampImpression icon="i-ph-storefront-bold" :tilt="-5" />
      </span>
      <p class="eyebrow-tag text-(--color-lima-200)">{{ t('closing.eyebrow') }}</p>
      <h2 class="type-display max-w-[16ch] text-highlighted">{{ t('closing.title') }}</h2>
      <p class="type-lead text-lg">{{ t('closing.lead') }}</p>
      <UButton :to="whatsappLink" target="_blank" size="xl" trailing-icon="i-ph-whatsapp-logo">
        {{ t('cta.whatsapp') }}
      </UButton>
      <p class="text-[0.9375rem] text-muted">{{ t('closing.note') }}</p>
    </div>
  </section>
</template>
