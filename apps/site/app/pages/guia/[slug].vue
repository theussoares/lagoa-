<script setup lang="ts">
import { GUIDE, findGuide } from '~/content/guide'

definePageMeta({ colorMode: 'light' })

const { t } = useI18n()
const route = useRoute()
const { siteUrl } = useRuntimeConfig().public

const entry = findGuide(String(route.params.slug))
if (!entry) throw createError({ statusCode: 404, statusMessage: 'Guide not found', fatal: true })

useSeoMeta({
  title: () => `${entry.title} · Lagoa+`,
  description: () => entry.description,
  ogTitle: () => entry.title,
  ogDescription: () => entry.description,
  ogLocale: 'pt_BR',
})
useHead({ link: siteUrl ? [{ rel: 'canonical', href: `${siteUrl}/guia/${entry.slug}` }] : [] })

const others = GUIDE.filter((item) => item.slug !== entry.slug)
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
    <NuxtLink to="/guia" class="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
      <UIcon name="i-ph-arrow-left" class="size-5" aria-hidden="true" />
      {{ t('guide.back') }}
    </NuxtLink>
    <header class="mt-6 mb-12">
      <h1 class="type-display text-highlighted">{{ entry.title }}</h1>
    </header>
    <ContentBody :blocks="entry.body" />

    <nav :aria-label="t('guide.more')" class="mt-16">
      <p class="type-card-title mb-4">{{ t('guide.more') }}</p>
      <ul class="flex flex-col">
        <li v-for="item in others" :key="item.slug" class="border-t border-(--lagoa-rule)">
          <NuxtLink :to="`/guia/${item.slug}`" class="flex min-h-14 items-center justify-between gap-4 py-3 font-semibold text-highlighted hover:text-primary">
            {{ item.title }}
            <UIcon name="i-ph-arrow-right" class="size-5 shrink-0" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
    </nav>
    <ArticleCta />
  </article>
</template>
