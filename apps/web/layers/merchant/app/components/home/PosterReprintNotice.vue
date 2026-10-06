<script setup lang="ts">
interface Emits {
  (event: 'print'): void
}

const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <InkNote
    tone="ink"
    icon="i-ph-printer"
    :title="t('home.posterReprint.title')"
    :description="t('home.posterReprint.body')"
    :actions="[{ label: t('home.posterReprint.action'), onClick: () => emit('print') }]"
  />
</template>
