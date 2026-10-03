<script setup lang="ts">
const { t } = useI18n()

// Exemplo ilustrativo; celular sempre mascarado, como no painel (LGPD).
const SAMPLE_LAPSED = [
  { phone: '(67) 9••••-0374', days: 34 },
  { phone: '(67) 9••••-1182', days: 41 },
  { phone: '(67) 9••••-5520', days: 58 },
] as const
</script>

<template>
  <section class="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
    <div v-reveal class="flex flex-col gap-6">
      <SectionHeading :eyebrow="t('lapsed.eyebrow')" :title="t('lapsed.title')" :lead="t('lapsed.lead')" />
      <p class="flex items-start gap-3 text-toned">
        <UIcon name="i-ph-lock-simple" class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        {{ t('lapsed.consent') }}
      </p>
    </div>

    <div v-reveal class="rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)" aria-hidden="true">
      <p class="type-h2 ledger-rule">{{ t('lapsed.listTitle') }}</p>
      <ul>
        <li v-for="customer in SAMPLE_LAPSED" :key="customer.phone" class="flex flex-wrap items-center justify-between gap-3 border-b border-(--lagoa-rule) py-4">
          <span class="flex flex-col">
            <span class="tabular font-semibold text-highlighted">{{ customer.phone }}</span>
            <span class="text-[0.9375rem] text-muted">{{ t('lapsed.daysAgo', { days: customer.days }) }}</span>
          </span>
          <StampTag :label="t('lapsed.consentTag')" tone="success" icon="i-ph-check-bold" />
        </li>
      </ul>
      <span class="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-inverted">
        <UIcon name="i-ph-paper-plane-tilt" class="size-5" />{{ t('lapsed.send') }}
      </span>
    </div>
  </section>
</template>
