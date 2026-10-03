<script setup lang="ts">
interface Props {
  title: string
}

defineProps<Props>()

const headingId = useId()
</script>

<template>
  <section :aria-labelledby="headingId" class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex min-h-12 items-center justify-between gap-3 border-b border-(--lagoa-rule) px-4 py-2">
      <h2 :id="headingId" class="letreiro text-base text-highlighted">{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div class="p-4">
      <slot />
    </div>
  </section>
</template>
