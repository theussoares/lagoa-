<script setup lang="ts">
import type { CheckInNoticeModel } from '../../utils/checkInModel'

interface Props {
  notice: CheckInNoticeModel
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-5 shadow-(--lagoa-shadow-card)" role="alert">
    <div class="flex items-start gap-3">
      <UIcon
        :name="notice.icon"
        class="mt-0.5 size-7 shrink-0"
        :class="notice.tone === 'warning' ? 'text-warning' : 'text-error'"
        aria-hidden="true"
      />
      <div class="flex min-w-0 flex-col gap-1">
        <h2 class="text-[1.375rem] leading-tight font-semibold text-highlighted [font-stretch:95%]">{{ notice.title }}</h2>
        <p class="text-pretty text-toned">{{ notice.message }}</p>
      </div>
    </div>
    <div class="flex flex-col gap-3">
      <slot />
    </div>
  </div>
</template>
