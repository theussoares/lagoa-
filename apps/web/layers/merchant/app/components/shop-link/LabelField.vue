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
        class="inline-flex min-h-11 items-center rounded-full border px-4 text-base font-semibold transition-all duration-(--lagoa-dur-fast) cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95"
        :class="
          label === t(`merchantShopLink.label.preset.${preset}`)
            ? 'border-[#0f6381] bg-[#0f6381]/10 text-[#0f6381] dark:border-cyan-400 dark:bg-cyan-400/15 dark:text-cyan-300 shadow-xs'
            : 'border-(--lagoa-rule) bg-default text-toned hover:border-[#0f6381]/50 hover:bg-[#0f6381]/5 hover:text-[#0f6381] dark:hover:border-cyan-400/40 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-300'
        "
        @click="label = t(`merchantShopLink.label.preset.${preset}`)"
      >
        {{ t(`merchantShopLink.label.preset.${preset}`) }}
      </button>
    </div>
  </div>
</template>
