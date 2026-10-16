<script setup lang="ts">
definePageMeta({ colorMode: 'dark' })

const { t } = useI18n()
const { linksUrl } = useRuntimeConfig().public
const { sections, merchantSignIn } = useLinksScreen()

useSeoMeta({
  title: () => t('seo.title'),
  description: () => t('seo.description'),
  ogTitle: () => t('seo.title'),
  ogDescription: () => t('seo.description'),
  ogType: 'website',
  ogLocale: 'pt_BR',
  ogUrl: linksUrl,
  twitterCard: 'summary',
})
useHead({ link: [{ rel: 'canonical', href: linksUrl }] })
</script>

<template>
  <main class="dark min-h-dvh bg-(--lagoa-header) px-4 py-10 text-default">
    <div class="mx-auto flex w-full max-w-md flex-col gap-8">
      <LinksProfile class="rise" />

      <section v-for="(section, index) in sections" :key="section.id" :aria-labelledby="section.title ? `links-${section.id}` : undefined" class="rise flex flex-col gap-3" :style="{ '--i': index + 1 }">
        <h2 v-if="section.title" :id="`links-${section.id}`" class="px-1 text-sm font-semibold tracking-wide text-muted uppercase">{{ section.title }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="link in section.items" :key="link.id">
            <LinkButton :link="link" />
          </li>
        </ul>
      </section>

      <footer class="flex flex-col items-center gap-1 text-center">
        <a :href="merchantSignIn.href" class="inline-flex min-h-11 items-center px-3 font-semibold text-(--color-sol-200) underline-offset-4 hover:underline">{{ merchantSignIn.label }}</a>
        <p class="text-[0.9375rem] text-muted">{{ t('links.footer') }}</p>
      </footer>
    </div>
  </main>
</template>
