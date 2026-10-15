<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <aside class="dark mt-16 flex flex-col items-start gap-5 rounded-(--radius-card) bg-(--lagoa-header) p-8 text-default sm:p-10">
    <p class="type-section max-w-[20ch]">{{ t('content.ctaTitle') }}</p>
    <p class="type-lead text-lg">{{ t('content.ctaLead') }}</p>
    <WhatsAppButton />
  </aside>
</template>
