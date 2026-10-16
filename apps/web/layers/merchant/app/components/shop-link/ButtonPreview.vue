<script setup lang="ts">
import type { ShopContactPreview } from '../../types/shopContact'

interface Props {
  preview: ShopContactPreview | null
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-toned">{{ t('merchantShopLink.preview.lead') }}</p>
    <div v-if="preview" class="flex flex-col gap-3">
      <!-- Mesmo botão do card do cliente, sem clique: aqui só se vê. -->
      <ActionButton
        role="primary"
        block
        disabled
        tabindex="-1"
        :icon="preview.icon"
        trailing-icon="i-ph-arrow-up-right"
        :label="preview.label"
        class="min-h-11"
      />
      <UButton
        :to="preview.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
        external
        variant="link"
        color="neutral"
        icon="i-ph-arrow-square-out"
        :label="t('merchantShopLink.preview.test')"
        class="min-h-11 self-start"
      />
    </div>
    <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-4 py-3 text-pretty text-toned" role="status">
      {{ t('merchantShopLink.preview.empty') }}
    </p>
  </div>
</template>
