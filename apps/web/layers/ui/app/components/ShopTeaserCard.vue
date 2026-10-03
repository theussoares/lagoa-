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
  <!-- Cartão em branco: a mesma folha da carteira, ainda sem carimbo. -->
  <article :aria-labelledby="titleId" class="flex flex-col rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex flex-col items-start gap-1 px-5 pt-5">
      <h3 :id="titleId" class="letreiro text-xl text-highlighted">{{ shop.shopName }}</h3>
      <p class="text-[0.9375rem] text-muted">{{ shop.place }}</p>
      <UBadge v-if="shop.tag" :label="shop.tag" color="primary" variant="subtle" icon="i-ph-flag-pennant" class="mt-1 rounded-full" />
    </header>

    <div class="px-5 pt-4 pb-5" aria-hidden="true">
      <ol v-if="shop.preview.kind === 'slots'" class="grid max-w-[22rem] gap-1.5" :style="slotGrid">
        <li v-for="slot in shop.preview.total" :key="slot" class="aspect-square">
          <StampImpression v-if="slot <= shop.preview.welcome" :icon="shop.icon" :tilt="shop.tilt" />
          <span v-else class="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-(--lagoa-slot) text-muted">
            <UIcon v-if="slot === shop.preview.total" name="i-ph-gift" class="size-[55%]" />
          </span>
        </li>
      </ol>
      <span v-else class="block h-1.5 overflow-hidden rounded-full bg-(--lagoa-rule)">
        <span class="block h-full origin-left rounded-full bg-primary" :style="{ transform: `scaleX(${shop.preview.fraction})` }" />
      </span>
    </div>

    <ul class="flex flex-col border-t border-(--lagoa-rule) px-5 py-1">
      <li class="flex items-start gap-3 border-b border-(--lagoa-rule) py-3">
        <UIcon name="i-ph-gift" class="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
        <span class="font-semibold text-highlighted">{{ shop.rule }}</span>
      </li>
      <li class="flex items-start gap-3 py-3">
        <UIcon name="i-ph-storefront" class="mt-0.5 size-5 shrink-0 text-muted" aria-hidden="true" />
        <span class="flex flex-col text-toned">
          <span>{{ shop.earn }}</span>
          <span v-if="shop.welcome">{{ shop.welcome }}</span>
        </span>
      </li>
    </ul>
  </article>
</template>
