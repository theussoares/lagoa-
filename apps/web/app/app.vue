<script setup lang="ts">
import { pt_br } from '@nuxt/ui/locale'
</script>

<template>
  <VitePwaManifest />
  <UApp :locale="pt_br" :toaster="{ position: 'top-center', duration: 4000 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <div class="fixed top-[max(env(safe-area-inset-top),1rem)] right-4 sm:top-6 sm:right-8 z-50 print:hidden">
      <ThemeToggle />
    </div>
  </UApp>
</template>
