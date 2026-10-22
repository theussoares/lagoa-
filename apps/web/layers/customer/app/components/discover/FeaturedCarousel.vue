<script setup lang="ts">
import type { ShopRailCardModel } from '../../types/discover'

interface Props {
  shops: readonly ShopRailCardModel[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <!-- O carrossel é o que sobe sobre a faixa do cabeçalho quando a chave do Hits está ligada. -->
  <section :aria-label="t('discover.featuredLabel')" class="relative -mx-5 -mt-10">
    <ul class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none]">
      <li v-for="(shop, index) in shops" :key="shop.id" :style="{ '--i': index + 1 }" class="rise w-72 shrink-0 snap-start">
        <article class="card-raised flex h-full flex-col overflow-hidden">
          <div class="relative h-32 bg-(--color-tinta-100) dark:bg-(--color-tinta-900)">
            <img v-if="shop.image" :src="shop.image" alt="" class="absolute inset-0 size-full object-cover" />
            <UIcon v-else :name="shop.icon" class="absolute -right-2 -bottom-4 size-24 text-primary opacity-15" aria-hidden="true" />
            <span v-if="shop.badge" class="eyebrow-tag absolute top-3 left-3 rounded-full bg-(--color-sol-400) px-3 py-1 text-(--color-sol-900)">
              {{ shop.badge }}
            </span>
            <span v-if="shop.seal" class="eyebrow-tag absolute bottom-3 left-3 rounded-full bg-(--color-sol-100) px-3 py-1 text-(--color-sol-900) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)">
              {{ shop.seal }}
            </span>
          </div>
          <div class="flex flex-col gap-0.5 px-4 pt-3 pb-4">
            <h3 class="font-display truncate text-lg font-bold text-highlighted">{{ shop.shopName }}</h3>
            <p class="truncate text-sm text-muted">{{ shop.meta }}</p>
          </div>
        </article>
      </li>
    </ul>
  </section>
</template>
