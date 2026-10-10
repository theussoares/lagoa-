<script setup lang="ts">
definePageMeta({ path: '/configuracoes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantSettings.title')} · ${t('app.name')}` })

const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
const photo = useShopPhoto()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantSettings.title')" :lead="t('merchantSettings.lead')" />
    <div class="flex max-w-[520px] flex-col gap-5">
      <PanelModule :title="t('merchantSettings.photo.title')">
        <SettingsShopPhoto :image-url="photo.imageUrl.value" :loading="photo.loading.value" :send="photo.send.value" @choose="photo.choose" />
      </PanelModule>
      <PanelModule :title="t('merchantSettings.appearance')">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </PanelModule>
    </div>
  </div>
</template>
