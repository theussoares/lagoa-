<script setup lang="ts">
const { t } = useI18n()

const RISKS = [
  { key: 'locked', icon: 'i-ph-lock-simple-bold' },
  { key: 'noContract', icon: 'i-ph-hand-waving-bold' },
  { key: 'setup', icon: 'i-ph-handshake-bold' },
] as const
</script>

<template>
  <ul :aria-label="t('pricing.risk.label')" class="grid gap-4 md:grid-cols-3">
    <li v-for="risk in RISKS" :key="risk.key" class="flex items-start gap-3 rounded-2xl bg-(--ui-bg-muted) p-4 text-toned">
      <UIcon :name="risk.icon" class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
      {{ t(`pricing.risk.${risk.key}`) }}
    </li>
  </ul>
</template>
