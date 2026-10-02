<script setup lang="ts">
import type { KnownShopModel } from '../types/discover'

interface Props {
  shops: readonly KnownShopModel[]
}

defineProps<Props>()
</script>

<template>
  <ul class="flex flex-col">
    <li
      v-for="shop in shops"
      :key="shop.id"
      class="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-4 border-b border-(--lagoa-rule) py-3 last:border-b-0"
    >
      <span class="size-10" aria-hidden="true">
        <StampImpression :icon="shop.icon" :tilt="shop.tilt" />
      </span>
      <span class="flex min-w-0 flex-col">
        <span class="letreiro truncate text-base text-toned">{{ shop.shopName }}</span>
        <span class="text-base text-muted">{{ shop.rule }}</span>
      </span>
    </li>
  </ul>
</template>
