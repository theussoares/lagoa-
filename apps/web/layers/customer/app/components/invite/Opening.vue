<script setup lang="ts">
interface Props {
  title: string
  lead: string
  image: string
  message: string
}

defineProps<Props>()
</script>

<template>
  <div>
    <ScreenHeader :title="title" :lead="lead" :image="image" :overlap="false" />
    <p class="text-center text-base text-muted" aria-live="polite">{{ message }}</p>
  </div>
</template>
