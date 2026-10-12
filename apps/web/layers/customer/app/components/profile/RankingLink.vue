<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <NuxtLink
    to="/ranking"
    class="card-tap flex min-h-12 items-center gap-3 px-4 text-highlighted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  >
    <UIcon name="i-ph-trophy" class="size-6 shrink-0 text-primary" aria-hidden="true" />
    <span class="flex-1 font-semibold">{{ t('ranking.link') }}</span>
    <UIcon name="i-ph-caret-right" class="size-5 shrink-0 text-muted" aria-hidden="true" />
  </NuxtLink>
</template>
