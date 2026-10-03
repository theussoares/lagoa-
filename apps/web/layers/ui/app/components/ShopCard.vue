<script setup lang="ts">
import type { ShopTeaserModel } from '../types/discover'

interface Props {
  shop: ShopTeaserModel
}

const props = defineProps<Props>()

const titleId = useId()

/** Casas do mesmo tamanho em todo cartão: um de 6 não fica com bolas maiores que um de 10. */
const MIN_COLUMNS = 10
const slotGrid = computed(() =>
  props.shop.preview.kind === 'slots'
    ? { gridTemplateColumns: `repeat(${Math.max(MIN_COLUMNS, props.shop.preview.total)}, minmax(0, 1fr))` }
    : undefined,
)
</script>

<template>
  <article :aria-labelledby="titleId" class="rise flex flex-col overflow-hidden rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <div class="relative h-36 bg-(--color-tinta-100) dark:bg-(--color-tinta-900)" aria-hidden="true">
      <img v-if="shop.showcase.image" :src="shop.showcase.image" alt="" class="absolute inset-0 size-full object-cover" />
      <UIcon v-else :name="shop.icon" class="absolute -right-2 -bottom-4 size-28 text-primary opacity-15" />
      <span
        v-if="shop.showcase.openLabel"
        class="eyebrow-tag absolute top-3 right-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-2 whitespace-nowrap rounded-full bg-(--color-lima-100) px-3 py-1.5 text-(--color-lima-900) ring-4 ring-(--ui-bg)"
      >
        <span class="live-dot size-2 rounded-full bg-(--color-lima-500)" />
        {{ shop.showcase.openLabel }}
      </span>
      <StampTag v-if="shop.tag" :label="shop.tag" icon="i-ph-flag-pennant" class="absolute top-3 left-3 bg-default" />
    </div>

    <div class="flex flex-col gap-4 px-5 pb-5">
      <header class="flex items-start gap-3">
        <span class="relative -mt-10 size-20 shrink-0 rounded-full bg-default p-1.5 shadow-(--lagoa-shadow-card)" aria-hidden="true">
          <StampImpression :icon="shop.icon" :tilt="shop.tilt" />
        </span>
        <div class="flex min-w-0 flex-col pt-2">
          <h3 :id="titleId" class="font-display truncate text-xl font-bold text-highlighted">{{ shop.shopName }}</h3>
          <p v-if="shop.showcase.rating || shop.showcase.distance" class="tabular flex items-center gap-1.5 text-base text-toned">
            <template v-if="shop.showcase.rating">
              <UIcon name="i-ph-star-fill" class="size-4 text-highlighted" aria-hidden="true" />
              <span class="font-semibold">{{ shop.showcase.rating }}</span>
            </template>
            <span v-if="shop.showcase.rating && shop.showcase.distance" aria-hidden="true">·</span>
            <span v-if="shop.showcase.distance">{{ shop.showcase.distance }}</span>
          </p>
          <p class="truncate text-base text-muted">{{ shop.place }}</p>
        </div>
      </header>

      <div aria-hidden="true">
        <ol v-if="shop.preview.kind === 'slots'" class="grid max-w-[22rem] gap-1.5" :style="slotGrid">
          <li v-for="slot in shop.preview.total" :key="slot" class="aspect-square">
            <StampImpression v-if="slot <= shop.preview.welcome" :icon="shop.icon" :tilt="shop.tilt" />
            <span v-else class="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-(--lagoa-slot) text-muted">
              <UIcon v-if="slot === shop.preview.total" name="i-ph-gift" class="size-[55%]" />
            </span>
          </li>
        </ol>
        <InkRule v-else :fraction="shop.preview.fraction" class="max-w-[22rem]" />
      </div>

      <p class="flex flex-col text-toned">
        <span class="font-semibold text-highlighted">{{ shop.rule }}</span>
        <span>{{ shop.earn }}<template v-if="shop.welcome"> · {{ shop.welcome }}</template></span>
      </p>

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
