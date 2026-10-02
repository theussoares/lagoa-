<script setup lang="ts">
import type { StampCardModel } from '../types/wallet'

interface Props {
  card: StampCardModel
  /** Nível do título do nome da loja na página. */
  headingLevel?: 'h2' | 'h3'
}

withDefaults(defineProps<Props>(), { headingLevel: 'h2' })
</script>

<template>
  <article class="flex flex-col rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex items-start justify-between gap-3 px-5 pt-5 pb-4">
      <div class="flex min-w-0 items-center gap-3">
        <UIcon :name="card.icon" class="size-6 shrink-0 text-primary" aria-hidden="true" />
        <div class="min-w-0">
          <component :is="headingLevel" class="letreiro text-[1.25rem] leading-[1.1] text-highlighted">
            {{ card.shopName }}
          </component>
          <p class="truncate text-base text-muted">{{ card.shopDetail }}</p>
        </div>
      </div>
      <span class="tabular shrink-0 pt-0.5 text-sm font-semibold tracking-[0.06em] text-toned [font-stretch:75%]" aria-hidden="true">
        {{ card.progress }}
      </span>
    </header>

    <div class="relative border-t border-(--lagoa-rule) px-5 py-5">
      <!-- a grade é desenho; a frase do rodapé (summary) diz o mesmo para leitor de tela -->
      <ol v-if="card.body.kind === 'slots'" class="grid grid-cols-5 gap-x-3 gap-y-3" aria-hidden="true">
        <StampSlot v-for="slot in card.body.slots" :key="slot.number" :model="slot" :icon="card.icon" />
      </ol>
      <PointsRuler v-else :balance="card.body.balance" :target="card.body.target" :label="card.body.label" />

      <div v-if="card.status.kind === 'ready'" class="pointer-events-none absolute inset-0 grid place-items-center">
        <RewardSeal :label="card.status.seal" :pressed="card.status.fresh" class="bg-default/85" />
      </div>
    </div>

    <footer class="flex flex-col gap-4 border-t border-(--lagoa-rule) px-5 pt-4 pb-5">
      <p class="sr-only">{{ card.summary }}</p>

      <div v-if="card.status.kind === 'remaining'" class="flex items-center gap-4" aria-hidden="true">
        <span class="tabular text-[3.5rem] leading-none font-extrabold text-primary [font-stretch:75%]">
          {{ card.status.count }}
        </span>
        <span class="flex min-w-0 flex-col">
          <span class="text-base text-muted">{{ card.status.unitLine }}</span>
          <span class="text-[1.375rem] leading-[1.2] font-semibold text-highlighted [font-stretch:95%]">
            {{ card.status.reward }}
          </span>
        </span>
      </div>

      <div v-else class="flex flex-col gap-0.5" aria-hidden="true">
        <span class="text-[1.375rem] leading-[1.2] font-semibold text-highlighted [font-stretch:95%]">
          {{ card.status.reward }}
        </span>
        <span v-if="card.status.note" class="text-base text-muted">{{ card.status.note }}</span>
      </div>

      <slot name="actions" />
    </footer>
  </article>
</template>
