<script setup lang="ts">
import type { StampCardModel } from '#layers/ui/app/types/wallet'

const { t } = useI18n()

const TOTAL_SLOTS = 10
const STAMPED_SLOTS = 8
const FRESH_STAMP_DELAY_MS = 500

const sampleCard = computed<StampCardModel>(() => ({
  id: 'landing-sample',
  shopName: t('card.shopName'),
  shopDetail: t('card.shopDetail'),
  icon: 'i-ph-scissors-bold',
  progress: `${String(STAMPED_SLOTS).padStart(2, '0')}/${TOTAL_SLOTS}`,
  body: { kind: 'slots', slots: sampleSlots(TOTAL_SLOTS, STAMPED_SLOTS, FRESH_STAMP_DELAY_MS) },
  status: {
    kind: 'remaining',
    count: String(TOTAL_SLOTS - STAMPED_SLOTS),
    unitLine: t('card.unitLine'),
    reward: t('card.reward'),
  },
  peek: t('card.peek'),
  summary: t('card.summary'),
  rewardReady: false,
}))
</script>

<template>
  <section id="inicio" class="dark relative overflow-hidden bg-(--lagoa-header) text-default">
    <div class="mx-auto grid max-w-6xl items-center gap-x-14 gap-y-10 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-44 lg:pb-28">
      <!-- O título é o LCP: chega pronto no HTML, sem esperar animação. -->
      <div class="flex flex-col items-start gap-6 sm:gap-7">
        <h1 class="type-display text-highlighted">
          {{ t('hero.titleLead') }}
          <span class="block text-(--color-lima-200)">{{ t('hero.titleAccent') }}</span>
        </h1>

        <p class="type-lead text-lg sm:text-xl">{{ t('hero.lead') }}</p>

        <div class="rise flex flex-wrap items-center gap-3" style="--i: 1">
          <WhatsAppButton />
          <UButton to="#balcao" size="xl" color="neutral" variant="link" trailing-icon="i-ph-arrow-down" class="hidden px-2 sm:inline-flex">
            {{ t('hero.secondary') }}
          </UButton>
        </div>

        <p class="text-[0.9375rem] text-muted">{{ t('hero.note') }}</p>
      </div>

      <!-- Ilustração: o figure fala a frase inteira, o desenho dentro fica fora da árvore. -->
      <figure role="img" class="relative mx-auto w-full max-w-[25rem] pb-12 lg:mr-0" :aria-label="t('hero.visualLabel')">
        <StampCard :card="sampleCard" heading-level="h3" />

        <!-- O canhoto do Balcão: o que o lojista vê no mesmo instante. -->
        <div class="rise absolute bottom-0 left-0 flex max-w-[19rem] items-center gap-3 rounded-2xl bg-(--ui-bg-elevated) p-3 pr-4 shadow-(--lagoa-shadow-card) sm:-left-10" style="--i: 6">
          <span class="size-11 shrink-0">
            <StampImpression icon="i-ph-check-fat-bold" :tilt="-5" pressed :delay-ms="500" />
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="type-tag text-highlighted">{{ t('hero.receipt') }}</span>
            <span class="tabular text-[0.9375rem] whitespace-nowrap text-muted">{{ t('hero.receiptDetail') }}</span>
          </span>
        </div>
      </figure>
    </div>
  </section>
</template>
