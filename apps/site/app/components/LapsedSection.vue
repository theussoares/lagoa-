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
  <section id="sumidos" class="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
    <div v-reveal class="flex flex-col gap-6">
      <StampTag :label="t('lapsed.proTag')" tone="reward" icon="i-ph-star-bold" class="self-start" />
      <SectionHeading :title="t('lapsed.title')" :lead="t('lapsed.lead', COPY_PARAMS)" />
      <p class="flex items-start gap-3 text-toned">
        <UIcon name="i-ph-lock-simple" class="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        {{ t('lapsed.consent') }}
      </p>
    </div>

    <!-- Página da caderneta do painel; desenho, o texto ao lado diz o mesmo. -->
    <figure v-reveal class="rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)" aria-hidden="true">
      <p class="type-h2 ledger-rule">{{ t('lapsed.listTitle', COPY_PARAMS) }}</p>
      <ul>
        <li v-for="customer in SAMPLE_LAPSED" :key="customer.phone" class="flex flex-wrap items-center justify-between gap-3 border-b border-(--lagoa-rule) py-4">
          <span class="flex flex-col">
            <span class="tabular text-lg font-semibold text-highlighted">{{ customer.phone }}</span>
            <span class="text-[0.9375rem] text-muted">{{ t('lapsed.daysAgo', { days: customer.days }) }}</span>
          </span>
          <StampTag :label="t('lapsed.consentTag')" tone="success" icon="i-ph-check-bold" />
        </li>
      </ul>
      <p class="mt-5 flex items-start gap-3 rounded-2xl bg-(--ui-bg-muted) p-4 text-toned">
        <UIcon name="i-ph-paper-plane-tilt" class="mt-0.5 size-5 shrink-0 text-primary" />
        {{ t('lapsed.reminder') }}
      </p>
      <figcaption class="mt-4 text-sm text-muted">{{ t('lapsed.sample') }}</figcaption>
    </figure>
  </section>
</template>
