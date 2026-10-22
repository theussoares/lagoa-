<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { appUrl } = useRuntimeConfig().public
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:items-start md:justify-between">
    <div class="flex flex-col gap-1">
      <p class="font-display text-2xl font-bold text-highlighted">Lagoa<span class="text-primary">+</span></p>
      <p class="text-[0.9375rem] text-muted">{{ t('footer.tagline') }}</p>
    </div>
    <nav :aria-label="t('footer.explore')" class="flex flex-col gap-1">
      <NuxtLink :to="localePath({ name: 'blog' })" class="inline-flex min-h-11 items-center text-toned hover:text-primary">{{ t('nav.blog') }}</NuxtLink>
      <NuxtLink :to="localePath({ name: 'guia' })" class="inline-flex min-h-11 items-center text-toned hover:text-primary">{{ t('nav.guide') }}</NuxtLink>
      <NuxtLink :to="`${localePath('/')}#preco`" class="inline-flex min-h-11 items-center text-toned hover:text-primary">{{ t('nav.pricing') }}</NuxtLink>
    </nav>
    <div class="flex flex-col gap-1 md:items-end">
      <a :href="`${appUrl}/balcao/entrar`" class="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
        {{ t('footer.merchantSignIn') }}
      </a>
      <LanguageSwitch />
      <p class="text-[0.9375rem] text-muted">{{ t('footer.copyright', { year }) }}</p>
    </div>
  </footer>
</template>
