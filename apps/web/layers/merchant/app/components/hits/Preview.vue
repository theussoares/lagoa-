<script setup lang="ts">
import type { HitItemPreview } from '../../types/hitItem'

interface Props {
  preview: HitItemPreview
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="text-toned">{{ t('merchantHits.preview.lead') }}</p>
    <!-- Só se vê: `inert` tira o clique e o foco do botão de mostra. -->
    <article class="overflow-hidden rounded-(--radius-card) ring-1 ring-(--lagoa-rule)" inert>
      <img v-if="preview.photoUrl" :src="preview.photoUrl" :alt="t('merchantHits.preview.photoAlt')" class="aspect-[16/9] w-full object-cover" >
      <div v-else class="flex aspect-[16/9] w-full items-center justify-center bg-elevated text-muted">
        <UIcon name="i-ph-image" class="size-8" aria-hidden="true" />
      </div>
      <div class="flex flex-col gap-2 p-4">
        <h3 class="text-base font-semibold text-highlighted">{{ preview.title || t('merchantHits.preview.titleEmpty') }}</h3>
        <p v-if="preview.description" class="text-[0.9375rem] text-toned">{{ preview.description }}</p>
        <p class="font-semibold text-highlighted tabular-nums">{{ preview.priceLabel ?? t('merchantHits.onRequest') }}</p>
        <ActionButton v-if="preview.button" role="primary" block :icon="preview.button.icon" :label="preview.button.label" class="min-h-11" />
        <p v-else class="text-[0.9375rem] text-muted">{{ t('merchantHits.preview.shopButton') }}</p>
      </div>
    </article>
  </div>
</template>
