<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId" class="rise rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex min-h-14 items-center justify-between gap-3 px-6 pt-3">
      <h2 :id="headingId" class="eyebrow-tag text-muted">{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div class="px-6 pt-2 pb-6">
      <slot />
    </div>
  </section>
</template>
