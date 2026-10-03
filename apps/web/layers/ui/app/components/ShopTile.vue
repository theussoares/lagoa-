<script setup lang="ts">
import type { KnownShopModel } from '../types/discover'

interface Props {
  shop: KnownShopModel
  to: string
}

defineProps<Props>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="rise flex h-full w-44 flex-col overflow-hidden rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card) transition-transform duration-(--lagoa-dur-fast) active:scale-[0.98]"
  >
    <span class="relative block h-24 bg-(--color-tinta-100) dark:bg-(--color-tinta-900)" aria-hidden="true">
      <img v-if="shop.showcase.image" :src="shop.showcase.image" alt="" class="absolute inset-0 size-full object-cover" />
      <UIcon v-else :name="shop.icon" class="absolute -right-2 -bottom-3 size-20 text-primary opacity-15" />
    </span>
    <span class="flex flex-1 flex-col gap-1 px-4 pt-3 pb-4">
      <span class="font-display text-base font-bold text-balance text-highlighted">{{ shop.shopName }}</span>
      <span v-if="shop.showcase.rating || shop.showcase.distance" class="tabular flex items-center gap-1 text-sm text-toned">
        <template v-if="shop.showcase.rating">
          <UIcon name="i-ph-star-fill" class="size-3.5 text-(--color-sol-500)" aria-hidden="true" />
          <span class="font-semibold">{{ shop.showcase.rating }}</span>
        </template>
        <span v-if="shop.showcase.rating && shop.showcase.distance" aria-hidden="true">·</span>
        <span v-if="shop.showcase.distance">{{ shop.showcase.distance }}</span>
      </span>
      <span class="text-pretty text-sm text-muted">{{ shop.rule }}</span>
    </span>
  </NuxtLink>
</template>
