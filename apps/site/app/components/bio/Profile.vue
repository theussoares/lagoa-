<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <p class="grid size-14 shrink-0 place-items-center rounded-full bg-(--color-sol-200) font-display text-3xl font-bold text-(--color-tinta-950)" aria-hidden="true">L+</p>
      <div class="flex flex-col">
        <h1 class="font-display text-2xl leading-none font-bold tracking-tight text-highlighted">Lagoa<span class="text-(--color-sol-200)">+</span></h1>
        <p class="mt-1 text-[0.9375rem] text-muted">{{ t('bio.tagline') }}</p>
      </div>
    </div>
    <p class="font-display text-xl leading-snug font-semibold text-balance text-highlighted">{{ t('bio.headline') }}</p>
  </header>
</template>
