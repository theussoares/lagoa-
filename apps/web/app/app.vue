<script setup lang="ts">
import { pt_br } from '@nuxt/ui/locale'
</script>

<template>
  <UApp :locale="pt_br" :toaster="{ position: 'top-center', duration: 4000 }">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
