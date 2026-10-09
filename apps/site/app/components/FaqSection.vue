<script setup lang="ts">
const { t } = useI18n()

const QUESTIONS = ['effort', 'app', 'system', 'results', 'checkIn', 'fraud', 'reward', 'price', 'plans', 'privacy', 'change', 'next'] as const
</script>

<template>
  <section id="duvidas" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-32">
      <div v-reveal class="lg:sticky lg:top-28 lg:self-start">
        <SectionHeading :title="t('faq.title')" />
      </div>

      <!-- <details> nativo: abre e fecha sem JavaScript e as respostas já estão no HTML. -->
      <div v-reveal class="rounded-(--radius-card) bg-default px-6 py-2 shadow-(--lagoa-shadow-card)">
        <details v-for="key in QUESTIONS" :key="key" class="faq group border-b border-(--lagoa-rule) last:border-b-0">
          <summary class="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[1.125rem] leading-snug font-bold text-highlighted">
            {{ t(`faq.items.${key}.q`) }}
            <UIcon name="i-ph-caret-down" class="size-5 shrink-0 text-muted transition-transform duration-(--lagoa-dur-base) group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p class="pb-5 text-base text-toned">{{ t(`faq.items.${key}.a`, COPY_PARAMS) }}</p>
        </details>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq summary::-webkit-details-marker {
  display: none;
}
</style>
