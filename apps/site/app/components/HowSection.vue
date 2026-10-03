<script setup lang="ts">
const { t } = useI18n()

const STEPS = [
  { key: 'setup', icon: 'i-ph-storefront-bold', tilt: -4 },
  { key: 'visit', icon: 'i-ph-seal-check-bold', tilt: 3 },
  { key: 'wallet', icon: 'i-ph-wallet-bold', tilt: -2 },
  { key: 'redeem', icon: 'i-ph-gift-bold', tilt: 5 },
] as const

const codeChars = computed(() => t('how.redeemCode').split(''))
</script>

<template>
  <section id="como-funciona" class="bg-(--ui-bg-muted)">
    <div class="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:gap-20 lg:py-32">
      <div class="flex flex-col gap-12">
        <div v-reveal>
          <SectionHeading :title="t('how.title')" :lead="t('how.lead')" />
        </div>

        <!-- A ordem importa (criar, lançar, acompanhar, resgatar): por isso é lista numerada. -->
        <ol class="flex flex-col">
          <li v-for="step in STEPS" :key="step.key" v-reveal class="flex gap-5 border-t border-(--lagoa-rule) py-7 first:border-t-0 first:pt-0">
            <span class="size-14 shrink-0">
              <StampImpression :icon="step.icon" :tilt="step.tilt" />
            </span>
            <div class="flex flex-col gap-1.5">
              <h3 class="type-card-title">{{ t(`how.steps.${step.key}.title`) }}</h3>
              <p class="text-toned">{{ t(`how.steps.${step.key}.body`) }}</p>
            </div>
          </li>
        </ol>
      </div>

      <div class="flex flex-col gap-5 lg:sticky lg:top-28 lg:self-start">
        <!-- Canhoto do resgate: o vermelho aparece porque há código em jogo. -->
        <!-- Os recortes do picote pintam a cor do fundo desta faixa. -->
        <div v-reveal class="rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)" style="--lagoa-desk: var(--ui-bg-muted)">
          <h3 class="letreiro px-6 pt-5 text-lg text-secondary">{{ t('how.redeemTitle') }}</h3>
          <StubPerforation class="my-4" />
          <div class="px-6 pb-6">
            <p class="flex justify-between gap-1.5">
              <span class="sr-only">{{ t('how.redeemCodeLabel') }}</span>
              <span
                v-for="(char, index) in codeChars"
                :key="index"
                class="grid h-16 flex-1 place-items-center rounded-(--ui-radius) bg-(--ui-bg-muted) text-[2rem] font-bold text-highlighted uppercase [font-stretch:62%]"
                aria-hidden="true"
              >{{ char }}</span>
            </p>
            <p class="mt-4 flex items-center gap-2 text-muted">
              <UIcon name="i-ph-timer" class="size-5" aria-hidden="true" />{{ t('how.redeemHint') }}
            </p>
          </div>
        </div>

        <div v-reveal class="flex gap-4 rounded-(--radius-card) bg-default p-6 shadow-(--lagoa-shadow-card)">
          <UIcon name="i-ph-shield-check" class="size-7 shrink-0 text-primary" aria-hidden="true" />
          <div class="flex flex-col gap-1.5">
            <h3 class="type-card-title">{{ t('how.fraudTitle') }}</h3>
            <p class="text-toned">{{ t('how.fraudBody') }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
