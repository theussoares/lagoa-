<script setup lang="ts">
import type { HitItemForm, HitItemFormErrorCode } from '../../types/hitItem'
import type { ShopContactForm, ShopContactFormErrorCode } from '../../types/shopContact'

interface Props {
  form: HitItemForm
  fieldError: HitItemFormErrorCode | ShopContactFormErrorCode | null
}

interface Emits {
  (event: 'useShopButton', value: boolean): void
  (event: 'change', patch: Partial<ShopContactForm>): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
const name = useId()
</script>

<template>
  <div class="flex flex-col gap-4">
    <fieldset class="flex flex-col gap-3">
      <legend class="mb-3 text-base font-medium text-highlighted">{{ t('merchantHits.button.legend') }}</legend>
      <label v-for="own in [false, true]" :key="String(own)" class="flex min-h-11 cursor-pointer items-center gap-3 text-base">
        <input type="radio" :name="name" class="size-5 accent-(--ui-primary)" :checked="form.useShopButton !== own" @change="$emit('useShopButton', !own)" >
        {{ t(own ? 'merchantHits.button.own' : 'merchantHits.button.shop') }}
      </label>
    </fieldset>
    <template v-if="!form.useShopButton">
      <ShopLinkKindChoice :model-value="form.contact.kind" :disabled="false" @update:model-value="$emit('change', { kind: $event })" />
      <ShopLinkWhatsappFields
        v-if="form.contact.kind === 'whatsapp'"
        :whatsapp="form.contact.whatsapp"
        :message="form.contact.message"
        :loading="false"
        :invalid="fieldError === 'invalidWhatsapp'"
        @update:whatsapp="$emit('change', { whatsapp: $event })"
        @update:message="$emit('change', { message: $event })"
      />
      <ShopLinkUrlFields v-else :model-value="form.contact.url" :loading="false" :invalid="fieldError === 'invalidUrl'" @update:model-value="$emit('change', { url: $event })" />
      <ShopLinkLabelField :model-value="form.contact.ctaLabel" :kind="form.contact.kind" :loading="false" :missing="fieldError === 'missingLabel'" @update:model-value="$emit('change', { ctaLabel: $event })" />
    </template>
  </div>
</template>
