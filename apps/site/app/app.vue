<script setup lang="ts">
import { pt_br } from '@nuxt/ui/locale'
import archivoUrl from '@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2?url'
import bricolageUrl from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2?url'

// As fontes do primeiro quadro só seriam descobertas depois do CSS; o preload as busca junto com ele.
useHead({
  link: [archivoUrl, bricolageUrl].map((href) => ({ rel: 'preload', as: 'font', type: 'font/woff2', href, crossorigin: 'anonymous' })),
})
</script>

<template>
  <!-- A LP não tem avisos transitórios: sem toaster, sem região "Notifications" vazia. -->
  <UApp :locale="pt_br" :toaster="null">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
