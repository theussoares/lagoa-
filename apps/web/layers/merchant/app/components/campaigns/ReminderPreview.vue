<script setup lang="ts">
import type { ReminderPreviewModel } from '../../types/campaign'

interface Props {
  preview: ReminderPreviewModel
  source: string
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-2 rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
    <p class="flex items-center gap-1.5 text-sm text-muted">
      <UIcon name="i-ph-bell-ringing" class="size-4 shrink-0" aria-hidden="true" />{{ source }}
    </p>
    <p class="font-bold text-highlighted">{{ preview.shopName }}</p>
    <p class="text-[0.9375rem] break-words whitespace-pre-line text-default">{{ preview.message }}</p>
    <p v-if="preview.bonus" class="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-primary">
      <UIcon name="i-ph-seal-check" class="size-4 shrink-0" aria-hidden="true" />{{ preview.bonus }}
    </p>
  </div>
</template>
