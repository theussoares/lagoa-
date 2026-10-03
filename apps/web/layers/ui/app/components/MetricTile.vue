<script setup lang="ts">
interface Props {
  /** "Visitas" */
  label: string
  value: string
  /** "nos últimos 7 dias" */
  hint?: string
  icon: string
}

defineProps<Props>()
</script>

<template>
  <div class="rise flex flex-col gap-3 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)">
    <div class="flex items-center justify-between gap-3">
      <span class="eyebrow-tag min-w-0 text-muted">{{ label }}</span>
      <span class="pop-tilt grid size-9 shrink-0 place-items-center rounded-xl bg-(--color-lima-100) text-(--color-lima-700) dark:bg-(--color-lima-900) dark:text-(--color-lima-200)" aria-hidden="true">
        <UIcon :name="icon" class="size-5" />
      </span>
    </div>
    <span class="font-display tabular text-[3rem] leading-none font-bold tracking-tight text-highlighted">{{ value }}</span>
    <span v-if="hint" class="text-sm font-medium text-(--color-lima-700) dark:text-(--color-lima-400)">{{ hint }}</span>
  </div>
</template>
