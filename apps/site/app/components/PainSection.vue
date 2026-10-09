<script setup lang="ts">
const { t } = useI18n()

const PAINS = [
  { key: 'slowDays', icon: 'i-ph-calendar-x-bold', tilt: -3 },
  { key: 'oneAndDone', icon: 'i-ph-user-minus-bold', tilt: 4 },
  { key: 'competitor', icon: 'i-ph-arrows-left-right-bold', tilt: -2 },
] as const
</script>

<template>
  <section id="dores" class="bg-(--ui-bg-muted)">
    <div class="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:py-32">
      <div v-reveal>
        <SectionHeading :title="t('pain.title')" />
      </div>

      <ul class="grid gap-6 md:grid-cols-3">
        <li v-for="pain in PAINS" :key="pain.key" v-reveal class="flex flex-col gap-5 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)">
          <span class="size-14 shrink-0">
            <StampImpression :icon="pain.icon" :tilt="pain.tilt" />
          </span>
          <p class="type-card-title">{{ t(`pain.items.${pain.key}`) }}</p>
        </li>
      </ul>

      <p v-reveal class="letreiro max-w-3xl border-t-2 border-highlighted pt-6 text-2xl text-highlighted sm:text-3xl">
        {{ t('pain.closing') }}
      </p>
    </div>
  </section>
</template>
