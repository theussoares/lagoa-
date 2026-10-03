<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import { SHOP_ADDRESS_MAX_LENGTH, SHOP_NAME_MAX_LENGTH, SHOP_NEIGHBORHOOD_MAX_LENGTH } from '#shared/constants/domain'
import { ShopCategorySchema } from '#shared/schemas/shop'
import type { ShopFieldErrors, ShopProfileForm } from '../../types/clubSetup'

interface Props {
  errors: ShopFieldErrors
}

defineProps<Props>()
const shop = defineModel<ShopProfileForm>('shop', { required: true })
const { t } = useI18n()

const categories = computed<SelectItem[]>(() => ShopCategorySchema.options.map((value) => ({ label: t(`shop.categories.${value}`), value })))

function setText(field: 'name' | 'neighborhood' | 'addressLine', value: string | number): void {
  shop.value = { ...shop.value, [field]: String(value) }
}

function setCategory(value: unknown): void {
  const parsed = ShopCategorySchema.safeParse(value)
  shop.value = { ...shop.value, category: parsed.success ? parsed.data : null }
}
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <UFormField :label="$t('clubSetup.shop.name')" :error="errors.name ? $t('clubSetup.shop.nameError', { max: SHOP_NAME_MAX_LENGTH }) : undefined" name="name" class="sm:col-span-2">
      <UInput :model-value="shop.name" :maxlength="SHOP_NAME_MAX_LENGTH" size="lg" class="w-full" autocomplete="organization" :placeholder="$t('clubSetup.shop.namePlaceholder')" @update:model-value="setText('name', $event)" />
    </UFormField>
    <UFormField :label="$t('clubSetup.shop.category')" :error="errors.category ? $t('clubSetup.shop.categoryError') : undefined" name="category">
      <USelect
        :model-value="shop.category ?? undefined"
        :items="categories"
        :placeholder="$t('clubSetup.shop.categoryPlaceholder')"
        size="lg"
        :ui="{ base: 'min-h-11' }"
        class="w-full"
        @update:model-value="setCategory"
      />
    </UFormField>
    <UFormField :label="$t('clubSetup.shop.neighborhood')" :error="errors.neighborhood ? $t('clubSetup.shop.neighborhoodError', { max: SHOP_NEIGHBORHOOD_MAX_LENGTH }) : undefined" name="neighborhood">
      <UInput :model-value="shop.neighborhood" :maxlength="SHOP_NEIGHBORHOOD_MAX_LENGTH" size="lg" class="w-full" @update:model-value="setText('neighborhood', $event)" />
    </UFormField>
    <UFormField
      :label="$t('clubSetup.shop.addressLine')"
      :hint="$t('clubSetup.shop.addressHint')"
      :error="errors.addressLine ? $t('clubSetup.shop.addressError', { max: SHOP_ADDRESS_MAX_LENGTH }) : undefined"
      name="addressLine"
      class="sm:col-span-2"
    >
      <UInput :model-value="shop.addressLine" :maxlength="SHOP_ADDRESS_MAX_LENGTH" size="lg" class="w-full" autocomplete="street-address" @update:model-value="setText('addressLine', $event)" />
    </UFormField>
  </div>
</template>
