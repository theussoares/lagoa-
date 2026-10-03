<script setup lang="ts">
interface Props {
  tone: 'success' | 'error'
  text: string
}

defineProps<Props>()
</script>

<template>
  <!-- O contêiner `aria-live` fica no pai, sempre montado: aqui só entra o texto. -->
  <span class="flex items-center gap-1.5 text-[0.9375rem]" :class="tone === 'error' ? 'text-error' : 'text-success'">
    <UIcon :name="tone === 'error' ? 'i-ph-warning-circle' : 'i-ph-check-circle'" class="size-4 shrink-0" aria-hidden="true" />{{ text }}
  </span>
</template>
