<script setup lang="ts">
// Destinos da barra inferior que ainda não foram construídos: em vez de 404, um aviso honesto.
definePageMeta({
  path: '/check-in',
  layout: 'customer',
  middleware: 'customer-auth',
})

const { t } = useI18n()
useHead({ title: () => `${t('upcoming.title')} · ${t('app.name')}` })
</script>

<template>
  <div class="flex flex-col items-start gap-4 pt-12">
    <h1 class="text-[1.75rem] leading-[1.15] font-bold text-balance text-highlighted [font-stretch:90%]">{{ t('upcoming.title') }}</h1>
    <p class="text-toned">{{ t('upcoming.lead') }}</p>
    <UButton to="/carteira" variant="outline" color="neutral" icon="i-ph-arrow-left" :label="t('upcoming.back')" />
  </div>
</template>
