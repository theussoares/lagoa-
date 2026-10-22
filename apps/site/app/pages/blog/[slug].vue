<script setup lang="ts">
import { findPost } from '~/content/posts'
import { buildArticleSchema } from '~/utils/schema'

definePageMeta({ colorMode: 'light' })

const { t, locale } = useI18n()
const siteLocale = useSiteLocale()
const route = useRoute()
const localePath = useLocalePath()
const { siteUrl } = useRuntimeConfig().public

const post = findPost(siteLocale.value, String(route.params.slug))
if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })

const url = siteUrl ? `${siteUrl}${localePath({ name: 'blog-slug', params: { slug: post.slug } })}` : ''
useSeoMeta({
  title: () => `${post.title} · Lagoa+`,
  description: () => post.description,
  ogTitle: () => post.title,
  ogDescription: () => post.description,
  ogType: 'article',
})
useLocaleSeo()
useHead({
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildArticleSchema(post, siteLocale.value, url)) }],
})

const dateLabel = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.date))
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
    <NuxtLink :to="localePath({ name: 'blog' })" class="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
      <UIcon name="i-ph-arrow-left" class="size-5" aria-hidden="true" />
      {{ t('blog.back') }}
    </NuxtLink>
    <header class="mt-6 mb-12 flex flex-col gap-5">
      <h1 class="type-display text-highlighted">{{ post.title }}</h1>
      <p class="type-tag text-muted">
        <time :datetime="post.date">{{ dateLabel }}</time> · {{ t('blog.readingTime', { minutes: post.readingMinutes }) }}
      </p>
    </header>
    <ContentBody :blocks="post.body" />
    <ArticleCta />
  </article>
</template>
