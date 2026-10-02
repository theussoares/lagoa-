<script setup lang="ts">
definePageMeta({ path: '/configuracoes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantSettings.title')} · ${t('app.name')}` })

const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <div class="flex flex-col gap-1">
      <h1 class="text-[1.75rem] leading-tight font-bold text-highlighted [font-stretch:90%]">{{ t('merchantSettings.title') }}</h1>
      <p class="text-muted">{{ t('merchantSettings.lead') }}</p>
    </div>
    <div class="max-w-[520px]">
      <PanelModule :title="t('merchantSettings.appearance')">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </PanelModule>
    </div>
  </div>
</template>
