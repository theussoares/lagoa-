<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<template>
  <p class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned">{{ message }}</p>
</template>
