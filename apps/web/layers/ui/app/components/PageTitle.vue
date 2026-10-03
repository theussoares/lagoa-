<script setup lang="ts">
interface Props {
  title: string
  lead?: string
  headingId?: string
  /** Passo a passo move o foco para o título ao trocar de etapa (`focus()` exposto). */
  focusable?: boolean
}

defineProps<Props>()

const heading = useTemplateRef<HTMLHeadingElement>('heading')

defineExpose({ focus: (): void => heading.value?.focus() })
</script>

<template>
  <header class="flex flex-col gap-3">
    <div class="flex min-h-12 items-end justify-between gap-4">
      <h1 :id="headingId" ref="heading" class="type-title focus:outline-none" :tabindex="focusable ? -1 : undefined">{{ title }}</h1>
      <slot name="actions" />
    </div>
    <p v-if="lead" class="type-lead">{{ lead }}</p>
    <!-- Apoio com marcação (telefone em destaque, link) que não cabe numa string. -->
    <slot />
  </header>
</template>
