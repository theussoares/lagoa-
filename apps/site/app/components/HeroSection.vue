<script setup lang="ts">
import type { StampCardModel, StampSlotModel } from '#layers/ui/app/types/wallet'

const { t } = useI18n()
const whatsappLink = useWhatsAppLink()

const TOTAL_SLOTS = 10
const STAMPED_SLOTS = 8
// Inclinações fixas por casa, como no app: cada carimbo cai torto do seu jeito.
const SLOT_TILTS = [-4, 3, -2, 5, -5, 2, -3, 4, -1, 3] as const
const FRESH_STAMP_DELAY_MS = 700

const slots = computed<StampSlotModel[]>(() =>
  SLOT_TILTS.slice(0, TOTAL_SLOTS).map((tilt, index) => {
    const number = index + 1
    return {
      number,
      stamped: number <= STAMPED_SLOTS,
      isRewardSlot: number === TOTAL_SLOTS,
      tilt,
      fresh: number === STAMPED_SLOTS,
      delayMs: FRESH_STAMP_DELAY_MS,
    }
  }),
)

const sampleCard = computed<StampCardModel>(() => ({
  id: 'landing-sample',
  shopName: t('card.shopName'),
  shopDetail: t('card.shopDetail'),
  icon: 'i-ph-scissors-bold',
  progress: `${String(STAMPED_SLOTS).padStart(2, '0')}/${TOTAL_SLOTS}`,
  body: { kind: 'slots', slots: slots.value },
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
    <div class="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-36 pb-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-44 lg:pb-28">
      <div class="flex flex-col items-start gap-7">
        <p class="rise eyebrow-tag inline-flex items-center gap-2.5 rounded-full bg-(--ui-bg-elevated) px-3.5 py-2 text-toned" style="--i: 0">
          <span class="live-dot size-2 rounded-full bg-(--color-lima-400)" aria-hidden="true" />
          {{ t('hero.eyebrow') }}
        </p>

        <h1 class="rise type-display text-highlighted" style="--i: 1">
          {{ t('hero.titleLead') }}
          <span class="block text-(--color-lima-200)">{{ t('hero.titleAccent') }}</span>
        </h1>

        <p class="rise type-lead text-lg sm:text-xl" style="--i: 2">{{ t('hero.lead') }}</p>

        <div class="rise flex flex-wrap items-center gap-3" style="--i: 3">
          <UButton :to="whatsappLink" target="_blank" size="xl" trailing-icon="i-ph-whatsapp-logo">
            {{ t('cta.primary') }}
          </UButton>
          <UButton to="#como-funciona" size="xl" color="neutral" variant="ghost" trailing-icon="i-ph-arrow-down">
            {{ t('hero.secondary') }}
          </UButton>
        </div>

        <p class="rise text-[0.9375rem] text-muted" style="--i: 4">{{ t('hero.note') }}</p>
      </div>

      <figure class="relative mx-auto w-full max-w-[25rem] pb-14 lg:mr-0" :aria-label="t('hero.visualLabel')">
        <StampCard :card="sampleCard" heading-level="h3" />

        <!-- O canhoto do Balcão: o que o lojista vê no mesmo instante. -->
        <div class="rise absolute -bottom-2 -left-4 flex max-w-[18rem] items-center gap-3 rounded-2xl bg-(--ui-bg-elevated) p-3 pr-4 shadow-(--lagoa-shadow-card) sm:-left-10" style="--i: 6">
          <span class="size-11 shrink-0">
            <StampImpression icon="i-ph-check-fat-bold" :tilt="-5" pressed :delay-ms="700" />
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
