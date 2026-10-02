<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'
import { ShopCategorySchema } from '#shared/schemas/shop'
import type { ShopFieldErrors, ShopProfileForm } from '../../utils/clubSetupForm'
import type { ShopFieldLimits, ShopFieldsLabels } from '../../utils/clubSetupLabels'

interface Props {
  labels: ShopFieldsLabels
  limits: ShopFieldLimits
  categories: SelectItem[]
  errors: ShopFieldErrors
}

defineProps<Props>()
const shop = defineModel<ShopProfileForm>('shop', { required: true })

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
    <UFormField :label="labels.name" :error="errors.name ? labels.nameError : undefined" name="name" class="sm:col-span-2">
      <UInput :model-value="shop.name" :maxlength="limits.name" size="lg" class="w-full" autocomplete="organization" :placeholder="labels.namePlaceholder" @update:model-value="setText('name', $event)" />
    </UFormField>
    <UFormField :label="labels.category" :error="errors.category ? labels.categoryError : undefined" name="category">
      <USelect
        :model-value="shop.category ?? undefined"
        :items="categories"
        :placeholder="labels.categoryPlaceholder"
        size="lg"
        :ui="{ base: 'min-h-11' }"
        class="w-full"
        @update:model-value="setCategory"
      />
    </UFormField>
    <UFormField :label="labels.neighborhood" :error="errors.neighborhood ? labels.neighborhoodError : undefined" name="neighborhood">
      <UInput :model-value="shop.neighborhood" :maxlength="limits.neighborhood" size="lg" class="w-full" @update:model-value="setText('neighborhood', $event)" />
    </UFormField>
    <UFormField
      :label="labels.addressLine"
      :hint="labels.addressHint"
      :error="errors.addressLine ? labels.addressError : undefined"
      name="addressLine"
      class="sm:col-span-2"
    >
      <UInput :model-value="shop.addressLine" :maxlength="limits.addressLine" size="lg" class="w-full" autocomplete="street-address" @update:model-value="setText('addressLine', $event)" />
    </UFormField>
  </div>
</template>
