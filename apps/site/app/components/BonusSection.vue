<script setup lang="ts">
const { t } = useI18n()

const RULES = [
  { key: 'welcome', icon: 'i-ph-hand-waving-bold', tilt: -3 },
  { key: 'birthday', icon: 'i-ph-cake-bold', tilt: 4 },
  { key: 'referral', icon: 'i-ph-users-three-bold', tilt: -5 },
  { key: 'surprise', icon: 'i-ph-calendar-star-bold', tilt: 2 },
] as const
</script>

<template>
  <section id="regras" class="mx-auto max-w-6xl px-4 py-16 sm:py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :title="t('bonus.title')" :lead="t('bonus.lead')" />
    </div>

    <!-- Página de caderneta: cada regra é uma linha pautada com o bônus batido como carimbo. -->
    <ul class="mt-12 grid border-t-2 border-highlighted md:grid-cols-2 md:gap-x-12">
      <li v-for="rule in RULES" :key="rule.key" v-reveal class="flex items-start gap-5 border-b border-(--lagoa-rule) py-7">
        <span class="relative size-20 shrink-0">
          <StampImpression :icon="rule.icon" :tilt="rule.tilt" />
          <span class="letreiro tabular absolute -right-2 -bottom-1 grid min-w-10 -rotate-6 place-items-center rounded-full bg-primary px-2 py-1 text-lg leading-none text-inverted">
            {{ t(`bonus.${rule.key}.tag`) }}
          </span>
        </span>
        <div class="flex flex-col gap-1.5 pt-1">
          <h3 class="type-card-title">{{ t(`bonus.${rule.key}.title`) }}</h3>
          <p class="text-toned">{{ t(`bonus.${rule.key}.body`) }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
