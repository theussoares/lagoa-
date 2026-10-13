<template>
  <div>
    <a href="#conteudo" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-full focus:bg-default focus:px-5 focus:py-3 focus:font-medium focus:text-highlighted focus:shadow-(--lagoa-shadow-card)">
      {{ $t('nav.skip') }}
    </a>
    <SiteHeader />
    <main id="conteudo" tabindex="-1" class="outline-none">
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
