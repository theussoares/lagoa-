<script setup lang="ts">
import { SHOP_WHATSAPP_MESSAGE_MAX_LENGTH } from '#shared/constants/domain'

interface Props {
  loading: boolean
  invalid: boolean
}

defineProps<Props>()
const whatsapp = defineModel<string>('whatsapp', { required: true })
const message = defineModel<string>('message', { required: true })
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField
      :label="t('merchantShopLink.whatsapp.label')"
      :description="t('merchantShopLink.whatsapp.hint')"
      name="whatsapp"
      :error="invalid ? t('merchantShopLink.whatsapp.invalid') : undefined"
    >
      <UInput
        v-model="whatsapp"
        type="tel"
        inputmode="tel"
        autocomplete="off"
        size="xl"
        icon="i-ph-whatsapp-logo"
        placeholder="(67) 99999-9999"
        :disabled="loading"
        class="w-full"
        :ui="{ base: 'min-h-11' }"
      />
    </UFormField>
    <UFormField
      :label="t('merchantShopLink.message.label')"
      :description="t('merchantShopLink.message.hint')"
      :hint="t('merchantShopLink.message.count', { count: message.length, max: SHOP_WHATSAPP_MESSAGE_MAX_LENGTH })"
      name="message"
    >
      <UTextarea
        v-model="message"
        :maxlength="SHOP_WHATSAPP_MESSAGE_MAX_LENGTH"
        :rows="3"
        autoresize
        size="lg"
        :placeholder="t('merchantShopLink.message.placeholder')"
        :disabled="loading"
        class="w-full"
      />
    </UFormField>
  </div>
</template>
