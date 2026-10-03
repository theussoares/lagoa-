<script setup lang="ts">
definePageMeta({ path: '/configuracoes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantSettings.title')} · ${t('app.name')}` })

const theme = useThemePreference('merchant')
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantSettings.title')" :lead="t('merchantSettings.lead')" />
    <div class="max-w-[520px]">
      <PanelModule :title="t('merchantSettings.appearance')">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </PanelModule>
    </div>
  </div>
</template>
