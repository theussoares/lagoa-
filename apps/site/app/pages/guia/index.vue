<script setup lang="ts">
import { getGuide } from '~/content/guide'

definePageMeta({ colorMode: 'light' })

const { t } = useI18n()
const siteLocale = useSiteLocale()
const localePath = useLocalePath()

useSeoMeta({
  title: () => t('guide.seoTitle'),
  description: () => t('guide.seoDescription'),
  ogTitle: () => t('guide.seoTitle'),
  ogDescription: () => t('guide.seoDescription'),
})
useLocaleSeo()

const guide = computed(() => getGuide(siteLocale.value))
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
    <header class="flex max-w-3xl flex-col gap-5">
      <h1 class="type-display text-highlighted">{{ t('guide.title') }}</h1>
      <p class="type-lead text-lg sm:text-xl">{{ t('guide.lead') }}</p>
    </header>

    <ul class="bento mt-14">
      <li v-for="(entry, index) in guide" :key="entry.slug" :class="index % 3 === 0 ? 'bento-wide' : 'bento-third'">
        <NuxtLink :to="localePath({ name: 'guia-slug', params: { slug: entry.slug } })" class="bento-tile flex h-full flex-col gap-4 rounded-(--radius-card) bg-(--ui-bg-muted) p-7 shadow-(--lagoa-shadow-card)">
          <UIcon :name="entry.icon" class="size-9 text-primary" aria-hidden="true" />
          <h2 class="type-card-title text-2xl">{{ entry.title }}</h2>
          <p class="text-toned">{{ entry.description }}</p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
