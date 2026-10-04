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
  <div class="flex flex-col gap-3 rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
    <p class="text-base text-muted">{{ labels.help }}</p>
    <UButton variant="outline" color="error" size="lg" block icon="i-ph-trash" :label="labels.button" @click="confirming = true" />

    <UDrawer v-model:open="confirming" :title="labels.confirmTitle" :description="labels.confirmDescription">
      <template #footer>
        <UButton color="error" size="xl" block :label="labels.confirm" :loading="pending" @click="emit('confirm')" />
        <UButton variant="outline" color="neutral" size="xl" block :label="labels.cancel" :disabled="pending" @click="confirming = false" />
      </template>
    </UDrawer>
  </div>
</template>
