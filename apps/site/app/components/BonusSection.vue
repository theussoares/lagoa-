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
  <section id="regras" class="dark bg-(--lagoa-desk) text-default">
    <div class="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <div v-reveal>
        <SectionHeading :eyebrow="t('bonus.eyebrow')" :title="t('bonus.title')" :lead="t('bonus.lead')" />
      </div>

      <ul class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="rule in RULES" :key="rule.key" v-reveal class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)">
          <div class="flex items-start justify-between">
            <span class="size-16">
              <StampImpression :icon="rule.icon" :tilt="rule.tilt" />
            </span>
            <StampTag :label="t(`bonus.${rule.key}.tag`)" />
          </div>
          <div class="flex flex-col gap-2">
            <h3 class="type-card-title">{{ t(`bonus.${rule.key}.title`) }}</h3>
            <p class="text-toned">{{ t(`bonus.${rule.key}.body`) }}</p>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
