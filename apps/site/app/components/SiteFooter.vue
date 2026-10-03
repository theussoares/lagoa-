<script setup lang="ts">
const { t } = useI18n()
const { appUrl } = useRuntimeConfig().public
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div class="flex flex-col gap-1">
      <p class="font-display text-2xl font-bold text-highlighted">Lagoa<span class="text-primary">+</span></p>
      <p class="text-[0.9375rem] text-muted">{{ t('footer.tagline') }}</p>
    </div>
    <div class="flex flex-col gap-1 sm:items-end">
      <a :href="`${appUrl}/balcao/entrar`" class="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
        {{ t('footer.merchantSignIn') }}
      </a>
      <p class="text-[0.9375rem] text-muted">{{ t('footer.copyright', { year }) }}</p>
    </div>
  </footer>
</template>
