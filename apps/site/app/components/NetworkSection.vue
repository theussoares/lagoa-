<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section id="rede" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
      <!-- desenho do Descobrir; o texto da seção diz o mesmo -->
      <div class="order-last flex flex-col gap-5 lg:order-first" aria-hidden="true">
        <div v-reveal class="flex flex-col gap-4 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)">
          <span class="eyebrow-tag self-start rounded-full bg-(--color-sol-100) px-3 py-1.5 text-(--color-sol-800) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)">
            {{ t('network.challengeTag') }}
          </span>
          <p class="type-card-title">{{ t('network.challengeTitle') }}</p>
          <p class="text-toned">{{ t('network.challengeBody') }}</p>
          <div class="flex items-center justify-between gap-4">
            <SlotRow :filled="1" :total="3" class="[&>li]:size-7" />
            <span class="type-tag tabular text-muted">{{ t('network.challengeProgress') }}</span>
          </div>
        </div>

        <div v-reveal class="flex items-center gap-4 rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
          <span class="grid size-14 shrink-0 place-items-center rounded-2xl bg-(--color-lima-100) text-(--color-lima-700) dark:bg-(--color-lima-900) dark:text-(--color-lima-200)">
            <UIcon name="i-ph-storefront" class="size-7" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-display text-[1.25rem] font-bold text-highlighted">{{ t('network.yourShop') }}</span>
            <span class="text-[0.9375rem] text-muted">{{ t('network.yourShopDetail') }}</span>
          </span>
          <span class="eyebrow-tag inline-flex items-center gap-2 text-(--color-lima-700) dark:text-(--color-lima-200)">
            <span class="live-dot size-2 rounded-full bg-(--color-lima-500)" />{{ t('network.openNow') }}
          </span>
        </div>
      </div>

      <div v-reveal>
        <SectionHeading :eyebrow="t('network.eyebrow')" :title="t('network.title')" :lead="t('network.lead')" />
      </div>
    </div>
  </section>
</template>
