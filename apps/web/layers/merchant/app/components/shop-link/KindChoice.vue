<script setup lang="ts">
import type { ShopContactKind } from '../../types/shopContact'

interface Props {
  disabled: boolean
}

defineProps<Props>()
const kind = defineModel<ShopContactKind>({ required: true })
const { t } = useI18n()
const name = useId()

const OPTIONS: readonly { kind: ShopContactKind; icon: string }[] = [
  { kind: 'whatsapp', icon: 'i-ph-whatsapp-logo' },
  { kind: 'url', icon: 'i-ph-link' },
]
</script>

<template>
  <fieldset class="flex flex-col gap-3" :disabled="disabled">
    <legend class="mb-3 text-base font-medium text-highlighted">{{ t('merchantShopLink.kind.legend') }}</legend>
    <div class="grid grid-cols-2 gap-3">
      <label
        v-for="option in OPTIONS"
        :key="option.kind"
        class="group relative flex min-h-11 cursor-pointer flex-col gap-1 rounded-(--radius-card) p-3 ring-1 ring-(--lagoa-rule) transition-shadow duration-(--lagoa-dur-fast) has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
      >
        <input v-model="kind" type="radio" :name="name" :value="option.kind" class="sr-only" />
        <span class="flex items-center gap-2 text-base font-semibold text-highlighted">
          <UIcon :name="option.icon" class="size-5 shrink-0" aria-hidden="true" />
          {{ t(`merchantShopLink.kind.${option.kind}.title`) }}
          <UIcon name="i-ph-check-circle-fill" class="ml-auto size-5 text-primary opacity-0 group-has-checked:opacity-100" aria-hidden="true" />
        </span>
        <span class="text-[0.9375rem] text-toned">{{ t(`merchantShopLink.kind.${option.kind}.hint`) }}</span>
      </label>
    </div>
  </fieldset>
</template>
