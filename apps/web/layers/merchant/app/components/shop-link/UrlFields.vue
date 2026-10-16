<script setup lang="ts">
import { SHOP_CTA_URL_MAX_LENGTH } from '#shared/constants/domain'

interface Props {
  loading: boolean
  invalid: boolean
}

defineProps<Props>()
const url = defineModel<string>({ required: true })
const { t } = useI18n()
</script>

<template>
  <UFormField
    :label="t('merchantShopLink.url.label')"
    :description="t('merchantShopLink.url.hint')"
    name="url"
    :error="invalid ? t('merchantShopLink.url.invalid') : undefined"
  >
    <UInput
      v-model="url"
      type="url"
      inputmode="url"
      autocomplete="off"
      autocapitalize="none"
      spellcheck="false"
      size="xl"
      icon="i-ph-link"
      :maxlength="SHOP_CTA_URL_MAX_LENGTH"
      placeholder="https://minhaloja.com.br"
      :disabled="loading"
      class="w-full"
      :ui="{ base: 'min-h-11' }"
    />
  </UFormField>
</template>
