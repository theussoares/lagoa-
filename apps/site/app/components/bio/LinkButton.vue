<script setup lang="ts">
import type { BioLinkItem } from '../../types/bioLink'

interface Props {
  link: BioLinkItem
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <a
    :href="link.href"
    :target="link.newTab ? '_blank' : undefined"
    rel="noopener"
    class="link-button group flex min-h-16 items-center gap-4 rounded-3xl px-5 py-3.5 text-left transition-[transform,background-color] duration-(--lagoa-dur-base) ease-(--ease-elegant) active:scale-[0.985]"
    :class="link.tone === 'primary' ? 'bg-(--color-sol-200) text-(--color-tinta-950)' : 'border border-(--lagoa-rule) bg-white/5 text-highlighted hover:bg-white/10'"
  >
    <UIcon :name="link.icon" class="size-7 shrink-0" aria-hidden="true" />
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="font-display text-lg leading-tight font-bold text-balance">{{ link.label }}</span>
      <span class="mt-0.5 text-[0.9375rem] leading-snug" :class="link.tone === 'primary' ? 'text-(--color-tinta-900)' : 'text-muted'">{{ link.hint }}</span>
    </span>
    <UIcon name="i-ph-arrow-up-right-bold" class="size-5 shrink-0 transition-transform duration-(--lagoa-dur-base) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
    <span v-if="link.newTab" class="sr-only">{{ t('bio.newTab') }}</span>
  </a>
</template>
