<script setup lang="ts">
const { t } = useI18n()
const { href, displayNumber } = useWhatsAppLink()

const STEPS = ['call', 'reply', 'setup'] as const
</script>

<template>
  <section class="px-4 pt-6 pb-6 sm:px-6">
    <div v-reveal class="dark mx-auto grid max-w-6xl gap-12 rounded-(--radius-card) bg-(--lagoa-header) px-6 py-16 text-default sm:px-12 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div class="flex flex-col items-start gap-6">
        <h2 class="type-display max-w-[14ch] text-highlighted">{{ t('closing.title') }}</h2>
        <p class="type-lead text-xl">{{ t('closing.lead') }}</p>
        <WhatsAppButton />
        <p class="flex flex-col">
          <span class="text-[0.9375rem] text-muted">{{ t('closing.phoneLabel') }}</span>
          <a :href="href" target="_blank" rel="noopener noreferrer" class="tabular inline-flex min-h-11 items-center font-display text-[1.75rem] font-bold text-highlighted underline-offset-4 hover:underline">
            {{ displayNumber }}<span class="sr-only"> {{ t('cta.newTab') }}</span>
          </a>
        </p>
      </div>

      <div class="flex flex-col gap-4">
        <h3 class="letreiro text-lg text-(--color-lima-200)">{{ t('closing.stepsLabel') }}</h3>
        <ol class="flex flex-col">
          <li v-for="(step, index) in STEPS" :key="step" class="flex items-center gap-4 border-t border-(--lagoa-rule) py-4 text-lg text-toned">
            <span class="letreiro tabular grid size-10 shrink-0 place-items-center rounded-full border-2 border-current text-(--color-lima-200)" aria-hidden="true">
              {{ index + 1 }}
            </span>
            {{ t(`closing.steps.${step}`) }}
          </li>
        </ol>
        <p class="text-[0.9375rem] text-muted">{{ t('closing.note') }}</p>
      </div>
    </div>
  </section>
</template>
