<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="flex flex-col items-center gap-3 text-center">
    <p class="grid size-24 place-items-center rounded-full bg-(--color-sol-200) font-display text-5xl font-bold text-(--color-tinta-950)" aria-hidden="true">L+</p>
    <h1 class="font-display text-3xl font-bold tracking-tight text-highlighted">Lagoa<span class="text-(--color-sol-200)">+</span></h1>
    <p class="max-w-xs text-lg leading-snug text-toned text-balance">{{ t('links.tagline') }}</p>
  </header>
</template>
