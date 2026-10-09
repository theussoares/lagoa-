<script setup lang="ts">
import type { PricingPlanKey } from '../types/pricing'
import type { WhatsAppMessage } from '../types/whatsapp'

interface Props {
  plan: PricingPlanKey
  items: readonly string[]
  featured?: boolean
  showInheritedLead?: boolean
  message: WhatsAppMessage
}

withDefaults(defineProps<Props>(), { featured: false, showInheritedLead: false })

const { t } = useI18n()
</script>

<template>
  <article class="flex flex-col gap-6 rounded-(--radius-card) p-8 shadow-(--lagoa-shadow-card)" :class="featured ? 'dark bg-(--lagoa-header) text-default' : 'bg-default'">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="type-card-title">{{ t(`pricing.plans.${plan}.name`) }}</h3>
      <StampTag v-if="featured" :label="t('pricing.featured')" tone="reward" icon="i-ph-star-bold" />
    </header>

    <div class="flex flex-col gap-1">
      <p class="sr-only">{{ t('pricing.priceLabel', { from: t(`pricing.plans.${plan}.from`), price: t(`pricing.plans.${plan}.price`) }) }}</p>
      <p class="text-muted" aria-hidden="true">
        <del>{{ t('pricing.currency') }} {{ t(`pricing.plans.${plan}.from`) }}</del>
      </p>
      <p class="flex items-baseline gap-1 text-highlighted" aria-hidden="true">
        <span class="font-display text-2xl font-bold">{{ t('pricing.currency') }}</span>
        <span class="font-display tabular text-[4rem] leading-none font-extrabold tracking-tight">{{ t(`pricing.plans.${plan}.price`) }}</span>
        <span class="text-lg text-muted">{{ t('pricing.period') }}</span>
      </p>
    </div>

    <p v-if="showInheritedLead" class="letreiro text-[0.9375rem] text-muted">{{ t(`pricing.plans.${plan}.lead`) }}</p>
    <ul class="flex flex-col gap-2" :aria-label="t('pricing.includesLabel')">
      <li v-for="item in items" :key="item" class="flex items-start gap-3">
        <UIcon name="i-ph-check-bold" class="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
        <span class="text-toned">{{ t(`pricing.plans.${plan}.items.${item}`) }}</span>
      </li>
    </ul>

    <WhatsAppButton block class="mt-auto" :message="message" :context="t(`pricing.plans.${plan}.name`)" />
  </article>
</template>
