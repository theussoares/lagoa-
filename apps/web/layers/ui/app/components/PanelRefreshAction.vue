<script setup lang="ts">
interface Props {
  /** "12 clientes"; some quando ainda não há contagem. */
  countText?: string
  loading: boolean
  /** Nome acessível do botão: "Atualizar lista". */
  label: string
}

interface Emits {
  refresh: []
}

withDefaults(defineProps<Props>(), { countText: undefined })
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex items-center gap-1">
    <span v-if="countText" class="tabular text-[0.9375rem] text-muted">{{ countText }}</span>
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-ph-arrow-clockwise"
      class="size-11 justify-center"
      :aria-label="label"
      :loading="loading"
      @click="emit('refresh')"
    />
  </div>
</template>
