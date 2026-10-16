<script setup lang="ts">
import { SHOP_CTA_LABEL_MAX_LENGTH } from '#shared/constants/domain'
import type { ShopContactKind } from '../../types/shopContact'
import { ctaLabelPresets } from '../../utils/shopContactForm'

interface Props {
  kind: ShopContactKind
  loading: boolean
  missing: boolean
}

defineProps<Props>()
const label = defineModel<string>({ required: true })
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField
      :label="t('merchantShopLink.label.label')"
      :description="t(kind === 'url' ? 'merchantShopLink.label.hintUrl' : 'merchantShopLink.label.hintWhatsapp')"
      name="ctaLabel"
      :error="missing ? t('merchantShopLink.label.missing') : undefined"
    >
      <UInput
        v-model="label"
        size="xl"
        :maxlength="SHOP_CTA_LABEL_MAX_LENGTH"
        :placeholder="kind === 'whatsapp' ? t('shopContact.defaultLabel') : undefined"
        :disabled="loading"
        class="w-full"
        :ui="{ base: 'min-h-11' }"
      />
    </UFormField>
    <div role="group" :aria-label="t('merchantShopLink.label.presets')" class="flex flex-wrap gap-2">
      <button
        v-for="preset in ctaLabelPresets(kind)"
        :key="preset"
        type="button"
        class="inline-flex min-h-11 items-center rounded-full border border-(--lagoa-rule) bg-default px-4 text-base font-semibold text-toned focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="label = t(`merchantShopLink.label.preset.${preset}`)"
      >
        {{ t(`merchantShopLink.label.preset.${preset}`) }}
      </button>
    </div>
  </div>
</template>
