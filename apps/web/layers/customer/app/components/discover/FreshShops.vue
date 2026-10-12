<script setup lang="ts">
import type { ShopTeaserModel } from '#layers/ui/app/types/discover'

interface Props {
  shops: readonly ShopTeaserModel[]
  searching: boolean
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section class="flex flex-col gap-3" aria-labelledby="fresh-title">
    <div class="flex flex-col gap-1">
      <h2 id="fresh-title" class="type-h2">
        {{ t('discover.freshTitle') }}
      </h2>
      <p v-if="shops.length > 0" class="text-pretty text-toned">{{ t('discover.howTo') }}</p>
    </div>
    <ul v-if="shops.length > 0" class="flex flex-col gap-4">
      <li v-for="(shop, index) in shops" :key="shop.id" :style="{ '--i': index + 1 }" class="rise">
        <ShopCard :shop="shop" class="!animate-none" />
      </li>
    </ul>
    <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned">
      {{ searching ? t('discover.noResults') : t('discover.freshEmpty') }}
    </p>
  </section>
</template>
