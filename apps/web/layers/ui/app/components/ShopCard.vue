<script setup lang="ts">
import type { ShopTeaserModel } from '../types/discover'

interface Props {
  shop: ShopTeaserModel
}

defineProps<Props>()

const titleId = useId()
</script>

<template>
  <article :aria-labelledby="titleId" class="rise flex flex-col overflow-hidden rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <ShopCardMedia :showcase="shop.showcase" :icon="shop.icon" :tag="shop.tag" />

    <div class="flex flex-col gap-4 px-5 pb-5">
      <header class="flex items-start gap-3">
        <span class="relative -mt-10 size-20 shrink-0 rounded-full bg-default p-1.5 shadow-(--lagoa-shadow-card)" aria-hidden="true">
          <StampImpression :icon="shop.icon" :tilt="shop.tilt" />
        </span>
        <div class="flex min-w-0 flex-col pt-2">
          <h3 :id="titleId" class="font-display truncate text-xl font-bold text-highlighted">{{ shop.shopName }}</h3>
          <p v-if="shop.showcase.rating || shop.showcase.distance" class="tabular flex items-center gap-1.5 text-base text-toned">
            <template v-if="shop.showcase.rating">
              <UIcon name="i-ph-star-fill" class="size-4 text-(--color-sol-500)" aria-hidden="true" />
              <span class="font-semibold">{{ shop.showcase.rating }}</span>
            </template>
            <span v-if="shop.showcase.rating && shop.showcase.distance" aria-hidden="true">·</span>
            <span v-if="shop.showcase.distance">{{ shop.showcase.distance }}</span>
          </p>
          <p class="truncate text-base text-muted">{{ shop.place }}</p>
        </div>
      </header>

      <ShopCardPreview :preview="shop.preview" :icon="shop.icon" :tilt="shop.tilt" />

      <div class="flex items-start gap-3 rounded-2xl bg-(--color-lima-50) px-4 py-3 dark:bg-(--color-tinta-950)">
        <UIcon name="i-ph-gift" class="mt-0.5 size-5 shrink-0 text-(--color-lima-700)" aria-hidden="true" />
        <p class="flex flex-col text-toned">
          <span class="font-semibold text-highlighted">{{ shop.rule }}</span>
          <span>{{ shop.earn }}<template v-if="shop.welcome"> · {{ shop.welcome }}</template></span>
        </p>
      </div>

      <UButton
        :to="shop.directions.href"
        target="_blank"
        external
        variant="outline"
        color="neutral"
        size="lg"
        block
        icon="i-ph-map-pin"
        trailing-icon="i-ph-arrow-up-right"
        :label="shop.directions.label"
        :aria-label="shop.directions.accessibleLabel"
        class="min-h-11"
      />
    </div>
  </article>
</template>
