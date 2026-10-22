<script setup lang="ts">
import type { HitsBannerModel } from '../../types/hits'

interface Props {
  banners: readonly HitsBannerModel[]
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <section :aria-label="t('hits.bannersLabel')" class="-mx-5">
    <ul class="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none]">
      <li
        v-for="(banner, index) in banners"
        :key="banner.id"
        :style="{ '--i': index + 1 }"
        class="rise relative flex h-40 w-[300px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-(--radius-card) bg-(--color-tinta-900) p-4"
      >
        <img :src="banner.photoUrl" alt="" loading="lazy" class="absolute inset-0 size-full object-cover" />
        <div class="absolute inset-0 bg-(image:--lagoa-scrim)" aria-hidden="true" />
        <span class="eyebrow-tag absolute top-3 left-3 rounded-full bg-(--color-sol-400) px-3 py-1 text-(--color-sol-900)">{{ banner.seal }}</span>
        <span class="font-display relative text-xl leading-tight font-bold text-balance text-white">{{ banner.title }}</span>
        <span class="relative text-sm text-white">{{ banner.shopName }}</span>
      </li>
    </ul>
  </section>
</template>
