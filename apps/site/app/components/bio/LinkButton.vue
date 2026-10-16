<script setup lang="ts">
import type { BioLinkItem } from '../../types/bioLink'

interface Props {
  link: BioLinkItem
}

interface Emits {
  (e: 'select', link: BioLinkItem): void
}

defineProps<Props>()
defineEmits<Emits>()
const { t } = useI18n()

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-sol-200)'
const TONES = {
  primary: 'bg-(--color-sol-200) text-(--color-tinta-950) hover:brightness-95',
  secondary: 'border border-(--color-sol-200)/50 bg-white/8 text-highlighted hover:bg-white/12',
  default: 'min-h-14 border border-(--lagoa-rule) bg-white/5 text-highlighted hover:bg-white/10',
} as const
</script>

<template>
  <a
    :href="link.href"
    :target="link.newTab ? '_blank' : undefined"
    rel="noopener"
    class="link-button group flex gap-3.5 rounded-xl px-4 py-3 text-left transition-[transform,background-color,filter] duration-(--lagoa-dur-base) ease-(--ease-elegant) active:scale-[0.985]"
    :class="[TONES[link.tone], FOCUS, link.cta ? 'flex-wrap items-start' : 'items-center']"
    @click="$emit('select', link)"
  >
    <UIcon :name="link.icon" :class="link.cta ? 'size-8' : 'size-6'" class="shrink-0" aria-hidden="true" />
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="font-display leading-tight font-bold text-balance" :class="link.cta ? 'text-xl' : 'text-base'">{{ link.label }}</span>
      <span class="mt-0.5 text-[0.9375rem] leading-snug" :class="link.tone === 'primary' ? 'text-(--color-tinta-900)' : 'text-muted'">{{ link.hint }}</span>
    </span>
    <span
      v-if="link.cta"
      class="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-base font-semibold"
      :class="link.tone === 'primary' ? 'bg-(--color-tinta-950) text-(--color-sol-200)' : 'bg-(--color-sol-200) text-(--color-tinta-950)'"
    >
      {{ link.cta }}
      <UIcon name="i-ph-arrow-right-bold" class="size-4" aria-hidden="true" />
    </span>
    <UIcon v-else name="i-ph-arrow-up-right-bold" class="size-5 shrink-0 transition-transform duration-(--lagoa-dur-base) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
    <span v-if="link.newTab" class="sr-only">{{ t('bio.newTab') }}</span>
  </a>
</template>
