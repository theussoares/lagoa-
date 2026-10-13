<script setup lang="ts">
import { POSTS } from '~/content/posts'

definePageMeta({ colorMode: 'light' })

const { t } = useI18n()
const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: () => t('blog.seoTitle'),
  description: () => t('blog.seoDescription'),
  ogTitle: () => t('blog.seoTitle'),
  ogDescription: () => t('blog.seoDescription'),
  ogLocale: 'pt_BR',
})
useHead({ link: siteUrl ? [{ rel: 'canonical', href: `${siteUrl}/blog` }] : [] })

const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 pt-32 pb-24 sm:px-6 lg:pt-40">
    <header class="flex max-w-3xl flex-col gap-5">
      <h1 class="type-display text-highlighted">{{ t('blog.title') }}</h1>
      <p class="type-lead text-lg sm:text-xl">{{ t('blog.lead') }}</p>
    </header>

    <ul class="mt-14 grid gap-6 md:grid-cols-2">
      <li v-for="(post, index) in POSTS" :key="post.slug" :class="index === 0 ? 'md:col-span-2' : ''">
        <NuxtLink :to="`/blog/${post.slug}`" class="bento-tile group flex h-full flex-col gap-4 rounded-(--radius-card) bg-(--ui-bg-muted) p-7 shadow-(--lagoa-shadow-card) sm:p-9">
          <p class="type-tag text-muted">
            <time :datetime="post.date">{{ dateFormat.format(new Date(post.date)) }}</time>
            · {{ t('blog.readingTime', { minutes: post.readingMinutes }) }}
          </p>
          <h2 :class="index === 0 ? 'type-section' : 'type-card-title text-2xl'">{{ post.title }}</h2>
          <p class="text-toned">{{ post.description }}</p>
          <span class="mt-auto inline-flex min-h-11 items-center gap-2 font-semibold text-primary">
            {{ t('blog.read') }}
            <UIcon name="i-ph-arrow-right" class="size-5 transition-transform duration-(--lagoa-dur-base) group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
