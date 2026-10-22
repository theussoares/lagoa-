<script setup lang="ts">
definePageMeta({ path: '/configuracoes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantSettings.title')} · ${t('app.name')}` })

const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
const photos = useShopPhotos()
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantSettings.title')" :lead="t('merchantSettings.lead')" />

    <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <!-- Coluna da esquerda: Logo e Tema do Painel -->
      <div class="flex flex-col gap-6 lg:col-span-5">
        <PanelModule :title="t('merchantSettings.photo.logo.title')">
          <SettingsShopPhoto
            kind="logo"
            :image-url="photos.urls.value.logo"
            :loading="photos.loading.value"
            :send="photos.send.value.logo"
            @choose="(file) => photos.choose('logo', file)"
          />
        </PanelModule>

        <PanelModule :title="t('merchantSettings.appearance')">
          <ThemeChoice v-model="theme" :labels="themeLabels" />
        </PanelModule>
      </div>

      <!-- Coluna da direita: Banner da loja em visualização ampla 16:9 -->
      <div class="flex flex-col gap-6 lg:col-span-7">
        <PanelModule :title="t('merchantSettings.photo.banner.title')">
          <SettingsShopPhoto
            kind="banner"
            :image-url="photos.urls.value.banner"
            :loading="photos.loading.value"
            :send="photos.send.value.banner"
            @choose="(file) => photos.choose('banner', file)"
          />
        </PanelModule>
      </div>
    </div>
  </div>
</template>
