<script setup lang="ts">
// Link da bio do Instagram. Sem cabeçalho nem rodapé da LP: é uma tela só, escura, para o celular.
definePageMeta({ layout: 'bare', colorMode: 'dark' })

const { t } = useI18n()
const { siteUrl } = useRuntimeConfig().public
const { sections, merchantSignIn } = useBioLinks()

useSeoMeta({
  title: () => t('bio.seo.title'),
  description: () => t('bio.seo.description'),
  ogTitle: () => t('bio.seo.title'),
  ogDescription: () => t('bio.seo.description'),
  ogType: 'website',
  ogLocale: 'pt_BR',
  ogUrl: siteUrl ? `${siteUrl}/links` : undefined,
  twitterCard: 'summary',
})
useHead({
  htmlAttrs: { class: 'bio-page' },
  link: siteUrl ? [{ rel: 'canonical', href: `${siteUrl}/links` }] : [],
})
</script>

<template>
  <main class="dark min-h-dvh bg-(--lagoa-header) px-4 py-10 text-default">
    <div class="mx-auto flex w-full max-w-md flex-col gap-8">
      <BioProfile class="rise" />

      <section v-for="(section, index) in sections" :key="section.id" :aria-labelledby="section.title ? `bio-${section.id}` : undefined" class="rise flex flex-col gap-3" :style="{ '--i': index + 1 }">
        <h2 v-if="section.title" :id="`bio-${section.id}`" class="px-1 text-sm font-semibold tracking-wide text-muted uppercase">{{ section.title }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="link in section.items" :key="link.id">
            <BioLinkButton :link="link" />
          </li>
        </ul>
      </section>

      <footer class="flex flex-col items-center gap-1 text-center">
        <a :href="merchantSignIn.href" class="inline-flex min-h-11 items-center px-3 font-semibold text-(--color-sol-200) underline-offset-4 hover:underline">{{ merchantSignIn.label }}</a>
        <p class="text-[0.9375rem] text-muted">{{ t('bio.footer') }}</p>
      </footer>
    </div>
  </main>
</template>
