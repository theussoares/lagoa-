<script setup lang="ts">
interface Props {
  filled: number
  total: number
}

defineProps<Props>()
</script>

<template>
  <!-- Miniatura das casas do cartão: tinta onde já carimbou, pontilhado onde falta. -->
  <ol class="flex flex-wrap gap-1.5" aria-hidden="true">
    <li
      v-for="slot in total"
      :key="slot"
      class="size-4 rounded-full"
      :class="slot <= filled ? 'bg-primary' : 'border-[1.5px] border-dashed border-(--lagoa-slot)'"
    />
  </ol>
</template>
