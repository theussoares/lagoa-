<script setup lang="ts">
interface Props {
  clock: string
  clockLabel: string
  urgent: boolean
  remainingFraction: number
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <p
      class="flex items-center justify-center gap-1.5 text-base font-medium"
      :class="urgent ? 'text-warning' : 'text-toned'"
    >
      <UIcon :name="urgent ? 'i-ph-warning-circle' : 'i-ph-timer'" class="size-5" aria-hidden="true" />
      <span>{{ clockLabel }}</span>
      <span class="tabular font-semibold" role="timer" aria-live="off">{{ clock }}</span>
    </p>
    <!-- Régua do prazo: encolhe junto com a contagem. -->
    <div class="h-1 overflow-hidden rounded-full bg-(--lagoa-rule)" aria-hidden="true">
      <div
        class="h-full origin-left rounded-full transition-transform duration-1000 ease-linear motion-reduce:transition-none"
        :class="urgent ? 'bg-warning' : 'bg-secondary'"
        :style="{ transform: `scaleX(${remainingFraction})` }"
      />
    </div>
  </div>
</template>
