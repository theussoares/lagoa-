<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

const { t } = useI18n()

const QUESTIONS = ['app', 'system', 'fraud', 'reward', 'change', 'privacy', 'price'] as const

const items = computed<AccordionItem[]>(() =>
  QUESTIONS.map((key) => ({
    value: key,
    label: t(`faq.items.${key}.q`),
    content: t(`faq.items.${key}.a`),
  })),
)
</script>

<template>
  <section id="duvidas" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
      <div v-reveal>
        <SectionHeading :eyebrow="t('faq.eyebrow')" :title="t('faq.title')" />
      </div>

      <div v-reveal class="rounded-(--radius-card) bg-default px-6 py-2 shadow-(--lagoa-shadow-card)">
        <UAccordion
          :items="items"
          :unmount-on-hide="false"
          :ui="{
            item: 'border-(--lagoa-rule)',
            trigger: 'min-h-16 py-4 text-left',
            label: 'font-display text-[1.125rem] leading-snug font-bold text-highlighted',
            body: 'pb-5 text-base text-toned',
          }"
        />
      </div>
    </div>
  </section>
</template>
