<script setup lang="ts">
import { SHOP_CTA_LABEL_MAX_LENGTH } from '#shared/constants/domain'
import type { ShopContactSaveState } from '../../types/shopContact'
import { CTA_LABEL_PRESETS } from '../../utils/shopContactForm'

interface Props {
  whatsapp: string
  ctaLabel: string
  loading: boolean
  state: ShopContactSaveState
}

interface Emits {
  'update:whatsapp': [value: string]
  'update:ctaLabel': [value: string]
  save: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="emit('save')">
    <p class="text-toned">{{ t('merchantSettings.contact.lead') }}</p>

    <UFormField :label="t('merchantSettings.contact.whatsappLabel')" :description="t('merchantSettings.contact.whatsappHint')" name="whatsapp" :error="state.status === 'error' && state.code === 'invalidWhatsapp' ? t('merchantSettings.contact.invalidWhatsapp') : undefined">
      <UInput
        :model-value="whatsapp"
        type="tel"
        inputmode="tel"
        autocomplete="off"
        size="xl"
        icon="i-ph-whatsapp-logo"
        placeholder="(67) 99999-9999"
        :disabled="loading"
        class="w-full"
        :ui="{ base: 'min-h-11' }"
        @update:model-value="emit('update:whatsapp', String($event))"
      />
    </UFormField>

    <UFormField :label="t('merchantSettings.contact.labelLabel')" :description="t('merchantSettings.contact.labelHint')" name="ctaLabel">
      <UInput
        :model-value="ctaLabel"
        size="xl"
        :maxlength="SHOP_CTA_LABEL_MAX_LENGTH"
        :placeholder="t('shopContact.defaultLabel')"
        :disabled="loading"
        class="w-full"
        :ui="{ base: 'min-h-11' }"
        @update:model-value="emit('update:ctaLabel', String($event))"
      />
    </UFormField>

    <div role="group" :aria-label="t('merchantSettings.contact.presets')" class="flex flex-wrap gap-2">
      <button
        v-for="preset in CTA_LABEL_PRESETS"
        :key="preset"
        type="button"
        class="inline-flex min-h-11 items-center rounded-full border border-(--lagoa-rule) bg-default px-4 text-base font-semibold text-toned focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="emit('update:ctaLabel', t(`merchantSettings.contact.preset.${preset}`))"
      >
        {{ t(`merchantSettings.contact.preset.${preset}`) }}
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <ActionButton role="primary" type="submit" :label="t('merchantSettings.contact.save')" :loading="state.status === 'saving'" :disabled="loading" />
      <p aria-live="polite" class="text-[0.9375rem]" :class="state.status === 'error' && state.code !== 'invalidWhatsapp' ? 'text-error' : 'text-muted'">
        <template v-if="state.status === 'saved'">{{ t('merchantSettings.contact.saved') }}</template>
        <template v-else-if="state.status === 'error' && state.code !== 'invalidWhatsapp'">{{ t(`errors.${state.code}`) }}</template>
      </p>
    </div>
  </form>
</template>
