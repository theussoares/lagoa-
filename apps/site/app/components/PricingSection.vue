<script setup lang="ts">
const { t } = useI18n()

const GROUPS = [
  { key: 'counter', items: ['counter', 'poster'] },
  { key: 'club', items: ['modes', 'bonus'] },
  { key: 'return', items: ['customers', 'campaigns', 'discover'] },
] as const
</script>

<template>
  <section id="preco" class="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :title="t('pricing.title')" align="center" />
    </div>

    <div v-reveal class="mx-auto mt-14 grid max-w-4xl overflow-hidden rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card) md:grid-cols-2">
      <div class="dark flex flex-col gap-6 bg-(--lagoa-header) p-8 text-default">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="type-card-title">{{ t('pricing.plan') }}</h3>
          <StampTag :label="t('pricing.locked')" icon="i-ph-lock-simple-bold" />
        </div>
        <p class="flex items-baseline gap-1 text-highlighted">
          <span class="font-display text-2xl font-bold">{{ t('pricing.currency') }}</span>
          <span class="font-display tabular text-[4.5rem] leading-none font-extrabold tracking-tight">{{ t('pricing.amount') }}</span>
          <span class="text-lg text-muted">{{ t('pricing.period') }}</span>
        </p>
        <p class="text-toned">{{ t('pricing.lockedNote') }}</p>
        <WhatsAppButton block class="mt-auto" />
        <p class="text-[0.9375rem] text-toned">{{ t('pricing.approval') }}</p>
      </div>

      <div class="flex flex-col gap-6 p-8">
        <div v-for="group in GROUPS" :key="group.key" class="flex flex-col gap-2">
          <h4 class="letreiro text-[0.9375rem] text-muted">{{ t(`pricing.groups.${group.key}.title`) }}</h4>
          <ul class="flex flex-col gap-2">
            <li v-for="item in group.items" :key="item" class="flex items-start gap-3">
              <UIcon name="i-ph-check-bold" class="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span class="text-toned">{{ t(`pricing.groups.${group.key}.items.${item}`) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
