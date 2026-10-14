<script setup lang="ts">
import { findPost } from '~/content/posts'
import { buildArticleSchema } from '~/utils/schema'

definePageMeta({ colorMode: 'light' })

const { t } = useI18n()
const route = useRoute()
const { siteUrl } = useRuntimeConfig().public

const post = findPost(String(route.params.slug))
if (!post) throw createError({ statusCode: 404, statusMessage: 'Post not found', fatal: true })

const url = siteUrl ? `${siteUrl}/blog/${post.slug}` : ''
useSeoMeta({
  title: () => `${post.title} · Lagoa+`,
  description: () => post.description,
  ogTitle: () => post.title,
  ogDescription: () => post.description,
  ogType: 'article',
  ogLocale: 'pt_BR',
})
useHead({
  link: url ? [{ rel: 'canonical', href: url }] : [],
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(buildArticleSchema(post, url)) }],
})

const dateLabel = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.date))
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
    <NuxtLink to="/blog" class="inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
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
