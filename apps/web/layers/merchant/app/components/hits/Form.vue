<script setup lang="ts">
import { HIT_ITEM_DESCRIPTION_MAX_LENGTH, HIT_ITEM_TITLE_MAX_LENGTH } from '#shared/constants/domain'
import type { HitItemForm, HitItemFormErrorCode } from '../../types/hitItem'
import type { ShopContactForm, ShopContactFormErrorCode } from '../../types/shopContact'

interface Props {
  form: HitItemForm
  photoUrl: string | null
  saving: boolean
  fieldError: HitItemFormErrorCode | ShopContactFormErrorCode | null
  /** Erro que não é de um campo (o servidor recusou, a foto não abriu): chave i18n completa. */
  errorKey: string | null
}

interface Emits {
  (event: 'change', patch: Partial<HitItemForm>): void
  (event: 'changeContact', patch: Partial<ShopContactForm>): void
  (event: 'choosePhoto', file: File): void
  (event: 'save' | 'cancel'): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="$emit('save')">
    <UFormField :label="t('merchantHits.fields.title.label')" name="title" :error="fieldError === 'missingTitle' ? t('merchantHits.errors.missingTitle') : undefined">
      <UInput :model-value="form.title" size="xl" :maxlength="HIT_ITEM_TITLE_MAX_LENGTH" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { title: String($event) })" />
    </UFormField>
    <UFormField
      :label="t('merchantHits.fields.description.label')"
      :hint="t('merchantHits.fields.description.count', { count: form.description.length, max: HIT_ITEM_DESCRIPTION_MAX_LENGTH })"
      name="description"
    >
      <UTextarea :model-value="form.description" :maxlength="HIT_ITEM_DESCRIPTION_MAX_LENGTH" :rows="2" autoresize class="w-full" @update:model-value="$emit('change', { description: String($event) })" />
    </UFormField>
    <div class="grid gap-5 sm:grid-cols-2">
      <UFormField :label="t('merchantHits.fields.price.label')" :description="t('merchantHits.fields.price.hint')" name="price" :error="fieldError === 'invalidPrice' ? t('merchantHits.errors.invalidPrice') : undefined">
        <UInput :model-value="form.price" inputmode="decimal" size="xl" placeholder="12,50" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { price: String($event) })" />
      </UFormField>
      <UFormField :label="t('merchantHits.fields.endsAt.label')" :description="t('merchantHits.fields.endsAt.hint')" name="endsAt" :error="fieldError === 'invalidEndsAt' ? t('merchantHits.errors.invalidEndsAt') : undefined">
        <UInput :model-value="form.endsAt" type="date" size="xl" class="w-full" :ui="{ base: 'min-h-11' }" @update:model-value="$emit('change', { endsAt: String($event) })" />
      </UFormField>
    </div>
    <HitsPhotoField :image-url="photoUrl" :missing="fieldError === 'missingPhoto'" :unreadable="errorKey === 'merchantHits.errors.unreadable'" @choose="$emit('choosePhoto', $event)" />
    <HitsContactFields :form="form" :field-error="fieldError" @use-shop-button="$emit('change', { useShopButton: $event })" @change="$emit('changeContact', $event)" />
    <div class="flex flex-wrap items-center gap-3">
      <ActionButton role="primary" type="submit" :label="t('merchantHits.save')" :loading="saving" />
      <ActionButton role="secondary" type="button" :label="t('merchantHits.cancel')" :disabled="saving" @click="$emit('cancel')" />
      <p aria-live="polite" class="text-[0.9375rem] text-error">
        <template v-if="errorKey">{{ t(errorKey) }}</template>
      </p>
    </div>
  </form>
</template>
