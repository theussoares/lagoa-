<script setup lang="ts">
interface Props {
  to: string
  label: string
}

defineProps<Props>()
</script>

<template>
  <HeaderIconLink :to="to" :label="label" icon="i-ph-arrow-left" />
</template>
