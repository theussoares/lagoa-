<script setup lang="ts">
interface Props {
  message: string
  action: string
  icon?: string
  actionIcon?: string
}

interface Emits {
  retry: []
}

withDefaults(defineProps<Props>(), { icon: 'i-ph-wifi-slash', actionIcon: 'i-ph-arrow-counter-clockwise' })
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex flex-col items-start gap-4 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)" role="alert">
    <p class="flex items-start gap-3 text-highlighted">
      <UIcon :name="icon" class="mt-0.5 size-6 shrink-0 text-error" aria-hidden="true" />
      <span>{{ message }}</span>
    </p>
    <UButton variant="outline" color="neutral" :icon="actionIcon" :label="action" @click="emit('retry')" />
  </div>
</template>
