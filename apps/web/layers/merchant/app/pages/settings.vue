<script setup lang="ts">
import { ShopPhotoKindSchema } from '#shared/schemas/shop'

definePageMeta({ path: '/configuracoes', layout: 'merchant', middleware: 'merchant-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('merchantSettings.title')} · ${t('app.name')}` })

const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
const photos = useShopPhotos()
const SHOP_PHOTO_KINDS = ShopPhotoKindSchema.options
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
    <PageTitle :title="t('merchantSettings.title')" :lead="t('merchantSettings.lead')" />
    <div class="flex max-w-[520px] flex-col gap-5">
      <PanelModule v-for="kind in SHOP_PHOTO_KINDS" :key="kind" :title="t(`merchantSettings.photo.${kind}.title`)">
        <SettingsShopPhoto
          :kind="kind"
          :image-url="photos.urls.value[kind]"
          :loading="photos.loading.value"
          :send="photos.send.value[kind]"
          @choose="(file) => photos.choose(kind, file)"
        />
      </PanelModule>
      <PanelModule :title="t('merchantSettings.appearance')">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </PanelModule>
    </div>
  </div>
</template>
