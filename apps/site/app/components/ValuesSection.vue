<script setup lang="ts">
const { t } = useI18n()

const CATEGORIES = [
  { key: 'barber', icon: 'i-ph-scissors' },
  { key: 'coffee', icon: 'i-ph-coffee' },
  { key: 'pizza', icon: 'i-ph-pizza' },
  { key: 'pet', icon: 'i-ph-paw-print' },
  { key: 'gym', icon: 'i-ph-barbell' },
] as const
</script>

<template>
  <section class="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
    <div v-reveal>
      <SectionHeading :eyebrow="t('values.eyebrow')" :title="t('values.title')" />
    </div>

    <ul class="mt-14 grid gap-5 md:grid-cols-3">
      <li v-reveal class="flex flex-col gap-6 rounded-(--radius-card) bg-default p-3 shadow-(--lagoa-shadow-card)">
        <!-- desenho do visor do Balcão; o texto abaixo diz o mesmo -->
        <div class="flex h-48 flex-col justify-center gap-4 rounded-2xl bg-(--ui-bg-muted) px-5" aria-hidden="true">
          <span class="text-base text-muted">{{ t('values.phoneLabel') }}</span>
          <span class="font-display tabular text-[1.875rem] leading-none font-bold text-highlighted">{{ t('values.phoneSample') }}</span>
          <span class="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-inverted">
            <UIcon name="i-ph-seal-check" class="size-5" />{{ t('values.giveStamp') }}
          </span>
        </div>
        <div class="flex flex-col gap-2 px-3 pb-4">
          <h3 class="type-card-title">{{ t('values.counter.title') }}</h3>
          <p class="text-toned">{{ t('values.counter.body') }}</p>
        </div>
      </li>

      <li v-reveal class="flex flex-col gap-6 rounded-(--radius-card) bg-default p-3 shadow-(--lagoa-shadow-card)">
        <div class="flex h-48 flex-col items-start justify-center gap-5 rounded-2xl bg-(--ui-bg-muted) px-5" aria-hidden="true">
          <SlotRow :filled="8" :total="10" class="[&>li]:size-6" />
          <span class="font-display text-[1.375rem] leading-tight font-bold text-highlighted">{{ t('values.remaining') }}</span>
        </div>
        <div class="flex flex-col gap-2 px-3 pb-4">
          <h3 class="type-card-title">{{ t('values.card.title') }}</h3>
          <p class="text-toned">{{ t('values.card.body') }}</p>
        </div>
      </li>

      <li v-reveal class="flex flex-col gap-6 rounded-(--radius-card) bg-default p-3 shadow-(--lagoa-shadow-card)">
        <ul class="flex h-48 flex-wrap content-center gap-2 rounded-2xl bg-(--ui-bg-muted) px-5" aria-hidden="true">
          <li v-for="category in CATEGORIES" :key="category.key" class="inline-flex items-center gap-1.5 rounded-full bg-default px-3 py-1.5 text-[0.9375rem] text-toned shadow-(--lagoa-shadow-card)">
            <UIcon :name="category.icon" class="size-4" />{{ t(`values.categories.${category.key}`) }}
          </li>
          <li class="inline-flex items-center gap-1.5 rounded-full bg-(--color-lima-100) px-3 py-1.5 text-[0.9375rem] font-semibold text-(--color-lima-700) dark:bg-(--color-lima-900) dark:text-(--color-lima-200)">
            <UIcon name="i-ph-storefront" class="size-4" />{{ t('values.categories.yours') }}
          </li>
        </ul>
        <div class="flex flex-col gap-2 px-3 pb-4">
          <h3 class="type-card-title">{{ t('values.network.title') }}</h3>
          <p class="text-toned">{{ t('values.network.body') }}</p>
        </div>
      </li>
    </ul>
  </section>
</template>
