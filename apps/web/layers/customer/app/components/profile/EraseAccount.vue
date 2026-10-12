<script setup lang="ts">
interface Props {
  pending: boolean
  labels: { help: string; button: string; confirmTitle: string; confirmDescription: string; confirm: string; cancel: string }
}

defineProps<Props>()
const emit = defineEmits<{ confirm: [] }>()
const confirming = ref(false)
</script>

<template>
  <div class="card flex flex-col gap-3 p-4">
    <p class="text-base text-muted">{{ labels.help }}</p>
    <ActionButton role="danger" block icon="i-ph-trash" :label="labels.button" @click="confirming = true" />

    <UDrawer v-model:open="confirming" :title="labels.confirmTitle" :description="labels.confirmDescription">
      <template #footer>
        <ActionButton role="dangerConfirm" size="xl" block :label="labels.confirm" :loading="pending" @click="emit('confirm')" />
        <ActionButton role="secondary" size="xl" block :label="labels.cancel" :disabled="pending" @click="confirming = false" />
      </template>
    </UDrawer>
  </div>
</template>
