<script setup lang="ts">
import type { StampCardModel } from '../types/wallet'
import { slotGridStyle } from '../utils/slotGrid'

interface Props {
  card: StampCardModel
  /** Nível do título do nome da loja na página. */
  headingLevel?: 'h2' | 'h3'
}

const props = withDefaults(defineProps<Props>(), { headingLevel: 'h2' })

const SLOTS_PER_ROW = 5
const SLOT_GAP = '0.75rem'
const slotGrid = computed(() => (props.card.body.kind === 'slots' ? slotGridStyle(props.card.body.slots.length, SLOTS_PER_ROW, SLOT_GAP) : undefined))
</script>

<template>
  <article class="rise flex flex-col rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
      <div class="flex min-w-0 items-center gap-3">
        <span class="pop-tilt grid size-12 shrink-0 place-items-center rounded-2xl bg-(--color-lima-100) text-(--color-lima-700) dark:bg-(--color-lima-900) dark:text-(--color-lima-200)" aria-hidden="true">
          <UIcon :name="card.icon" class="size-7" />
        </span>
        <div class="min-w-0">
          <component :is="headingLevel" class="font-display text-[1.25rem] leading-[1.1] font-bold text-balance text-highlighted">
            {{ card.shopName }}
          </component>
          <p class="truncate text-base text-muted">{{ card.shopDetail }}</p>
        </div>
      </div>
      <span class="eyebrow-tag tabular shrink-0 rounded-full bg-(--ui-bg-elevated) px-3 py-1.5 text-toned" aria-hidden="true">
        {{ card.progress }}
      </span>
    </header>

    <div class="relative mx-3 rounded-2xl bg-(--ui-bg-muted) px-4 py-5">
      <!-- a grade é desenho; a frase do rodapé (summary) diz o mesmo para leitor de tela -->
      <ol v-if="card.body.kind === 'slots'" class="mx-auto grid" :style="slotGrid" aria-hidden="true">
        <StampSlot v-for="slot in card.body.slots" :key="slot.number" :model="slot" :icon="card.icon" />
      </ol>
      <PointsRuler v-else :balance="card.body.balance" :target="card.body.target" :label="card.body.label" />

      <div v-if="card.status.kind === 'ready'" class="pointer-events-none absolute inset-0 grid place-items-center">
        <RewardSeal :label="card.status.seal" :pressed="card.status.fresh" class="bg-default/85" />
      </div>
    </div>

    <footer class="flex flex-col gap-4 px-5 pt-5 pb-5">
      <p class="sr-only">{{ card.summary }}</p>

      <div v-if="card.status.kind === 'remaining'" class="flex items-center gap-4" aria-hidden="true">
        <span class="font-display tabular text-[3.5rem] leading-none font-extrabold tracking-tight text-primary">
          {{ card.status.count }}
        </span>
        <span class="flex min-w-0 flex-col">
          <span class="text-base text-muted">{{ card.status.unitLine }}</span>
          <span class="font-display text-[1.375rem] leading-[1.15] font-bold text-highlighted">
            {{ card.status.reward }}
          </span>
        </span>
      </div>

      <div v-else class="flex flex-col gap-0.5" aria-hidden="true">
        <span class="font-display text-[1.5rem] leading-[1.15] font-bold text-highlighted">
          {{ card.status.reward }}
        </span>
        <span v-if="card.status.note" class="text-base text-muted">{{ card.status.note }}</span>
      </div>

      <p v-if="card.note" class="border-t border-dashed border-default pt-4 text-base text-toned">{{ card.note }}</p>

      <slot name="actions" />
    </footer>
  </article>
</template>
