<script setup lang="ts">
import { pt_br } from '@nuxt/ui/locale'
</script>

<template>
  <!-- A LP não tem avisos transitórios: sem toaster, sem região "Notifications" vazia. -->
  <UApp :locale="pt_br" :toaster="null">
    <NuxtPage />
  </UApp>
</template>
