<script setup lang="ts">
interface Props {
  message?: string
}

withDefaults(defineProps<Props>(), { message: undefined })
</script>

<template>
  <span v-if="message" class="flex items-start gap-1.5">
    <UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}
  </span>
</template>
