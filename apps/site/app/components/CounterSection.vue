<script setup lang="ts">
import { VISIT_QR_TTL_MINUTES } from '#shared/constants/domain'

const { t } = useI18n()

const STEPS = ['generate', 'scan'] as const
const BULLETS = [
  { key: 'newCustomer', icon: 'i-ph-user-plus' },
  { key: 'singleUse', icon: 'i-ph-qr-code' },
  { key: 'noPhone', icon: 'i-ph-keyboard' },
] as const
</script>

<template>
  <section id="balcao" class="dark bg-(--lagoa-header) text-default">
    <div class="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 sm:py-24 sm:px-6 lg:gap-16 lg:py-32">
      <div v-reveal class="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-16">
        <div class="flex flex-col gap-8">
          <SectionHeading :title="t('counter.title')" :lead="t('counter.lead')" />
          <ul class="flex flex-col">
            <li v-for="bullet in BULLETS" :key="bullet.key" class="flex items-center gap-3 border-t border-(--lagoa-rule) py-4 text-toned">
              <UIcon :name="bullet.icon" class="size-6 shrink-0 text-(--color-lima-200)" aria-hidden="true" />
              {{ t(`counter.bullets.${bullet.key}`, { minutes: VISIT_QR_TTL_MINUTES }) }}
            </li>
          </ul>
        </div>

        <!-- A ordem importa (gerar, escanear): por isso é lista numerada. -->
        <ol :aria-label="t('counter.stepsLabel')" class="flex flex-col gap-6">
          <li v-for="(step, index) in STEPS" :key="step" class="flex gap-5 rounded-(--radius-card) border border-(--lagoa-rule) p-6">
            <span class="letreiro tabular grid size-12 shrink-0 place-items-center rounded-full border-2 border-current text-xl text-(--color-lima-200)" aria-hidden="true">
              {{ index + 1 }}
            </span>
            <div class="flex flex-col gap-1.5">
              <h3 class="type-card-title text-highlighted">{{ t(`counter.steps.${step}.title`) }}</h3>
              <p class="text-toned">{{ t(`counter.steps.${step}.body`) }}</p>
            </div>
          </li>
        </ol>
      </div>

      <!-- Hidrata junto com a página: com hidratação tardia, o que se digitava antes
           aparecia no campo mas não chegava ao estado, e o botão ficava travado. -->
      <CounterDemo />
    </div>
  </section>
</template>
