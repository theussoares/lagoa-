<script setup lang="ts">
import type { KnownShopModel } from '#layers/ui/app/types/discover'

interface Props {
  shops: readonly KnownShopModel[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="known-title">
    <h2 id="known-title" class="type-h2">
      {{ t('discover.knownTitle') }}
    </h2>
    <ul class="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 [scrollbar-width:none]">
      <li v-for="(shop, index) in shops" :key="shop.id" :style="{ '--i': index + 1 }" class="rise shrink-0 snap-start">
        <ShopTile :shop="shop" to="/carteira" class="!animate-none" />
      </li>
    </ul>
    <ActionButton role="quiet" to="/carteira" trailing-icon="i-ph-arrow-right" :label="t('discover.openWallet')" class="self-start" />
  </section>
</template>
