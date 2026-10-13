<script setup lang="ts">
import { computeRoi, formatBrl, FOUNDER_PRICE_CENTS } from '~/utils/roi'

const { t } = useI18n()

const ticketReais = ref(30)
const extraReturns = ref(3)

const result = computed(() => computeRoi(ticketReais.value * 100, extraReturns.value))
const ticketFill = computed(() => `${((ticketReais.value - 10) / (150 - 10)) * 100}%`)
const returnsFill = computed(() => `${((extraReturns.value - 1) / (30 - 1)) * 100}%`)
const verdict = computed(() =>
  result.value.coversPlan
    ? t('roi.covers', { net: formatBrl(result.value.netCents) })
    : t('roi.short', { count: result.value.returnsToCoverPlan - extraReturns.value }),
)
const ticketId = useId()
const returnsId = useId()
</script>

<template>
  <section id="calculadora" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-32">
      <div v-reveal class="flex flex-col gap-6">
        <SectionHeading :title="t('roi.title')" :lead="t('roi.lead')" />
      </div>

      <div v-reveal class="flex flex-col gap-8 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card) sm:p-9">
        <div class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-4">
            <label :for="ticketId" class="font-semibold text-highlighted">{{ t('roi.ticket') }}</label>
            <output :for="ticketId" class="font-display tabular text-2xl font-bold text-highlighted">{{ formatBrl(ticketReais * 100) }}</output>
          </div>
          <input :id="ticketId" v-model.number="ticketReais" type="range" min="10" max="150" step="5" class="range" :style="{ '--fill': ticketFill }">
        </div>

        <div class="flex flex-col gap-3">
          <div class="flex items-baseline justify-between gap-4">
            <label :for="returnsId" class="font-semibold text-highlighted">{{ t('roi.returns') }}</label>
            <output :for="returnsId" class="font-display tabular text-2xl font-bold text-highlighted">{{ extraReturns }}</output>
          </div>
          <input :id="returnsId" v-model.number="extraReturns" type="range" min="1" max="30" step="1" class="range" :style="{ '--fill': returnsFill }">
        </div>

        <dl class="grid grid-cols-2 gap-4 border-t-2 border-highlighted pt-6">
          <div>
            <dt class="type-tag text-muted">{{ t('roi.extra') }}</dt>
            <dd class="font-display tabular text-3xl font-bold text-highlighted sm:text-4xl">{{ formatBrl(result.extraRevenueCents) }}</dd>
          </div>
          <div>
            <dt class="type-tag text-muted">{{ t('roi.plan') }}</dt>
            <dd class="font-display tabular text-3xl font-bold text-muted sm:text-4xl">{{ formatBrl(FOUNDER_PRICE_CENTS) }}</dd>
          </div>
        </dl>

        <p class="font-semibold text-highlighted" aria-live="polite">{{ verdict }}</p>
        <p class="text-[0.9375rem] text-muted">{{ t('roi.note') }}</p>
      </div>
    </div>
  </section>
</template>
