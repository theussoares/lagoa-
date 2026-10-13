<script setup lang="ts">
const { t } = useI18n()

const RULES = [
  { key: 'surprise', icon: 'i-ph-calendar-star-bold', tilt: 2, span: 'bento-wide', featured: true },
  { key: 'referral', icon: 'i-ph-users-three-bold', tilt: -5, span: 'bento-third', featured: false },
  { key: 'welcome', icon: 'i-ph-hand-waving-bold', tilt: -3, span: 'bento-third', featured: false },
  { key: 'birthday', icon: 'i-ph-cake-bold', tilt: 4, span: 'bento-wide', featured: false },
] as const
</script>

<template>
  <section id="regras" class="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :title="t('bonus.title')" :lead="t('bonus.lead')" />
    </div>

    <ul class="bento mt-12">
      <li
        v-for="rule in RULES"
        :key="rule.key"
        v-reveal
        class="bento-tile flex flex-col justify-between gap-8 rounded-(--radius-card) p-7 shadow-(--lagoa-shadow-card) sm:p-9"
        :class="[rule.span, rule.featured ? 'dark bg-(--lagoa-header) text-default' : 'bg-(--ui-bg-muted)']"
      >
        <span class="relative size-20 shrink-0">
          <StampImpression :icon="rule.icon" :tilt="rule.tilt" />
          <span class="letreiro tabular absolute -right-2 -bottom-1 grid min-w-10 -rotate-6 place-items-center rounded-full bg-primary px-2 py-1 text-lg leading-none text-inverted">
            {{ t(`bonus.${rule.key}.tag`) }}
          </span>
        </span>
        <div class="flex flex-col gap-2">
          <h3 :class="rule.featured ? 'type-section' : 'type-card-title'">{{ t(`bonus.${rule.key}.title`) }}</h3>
          <p class="text-toned">{{ t(`bonus.${rule.key}.body`) }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
