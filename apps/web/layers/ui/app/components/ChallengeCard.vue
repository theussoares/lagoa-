<script setup lang="ts">
import type { ChallengeModel } from '../types/discover'

interface Props {
  challenge: ChallengeModel
  /** "Desafio completo" */
  doneLabel: string
}

defineProps<Props>()

const titleId = useId()
</script>

<template>
  <article :aria-labelledby="titleId" class="flex flex-col rounded-(--radius-card) bg-default shadow-(--lagoa-shadow-card)">
    <header class="flex flex-col gap-1 px-5 pt-5 pb-4">
      <h3 :id="titleId" class="text-[1.375rem] leading-tight font-semibold text-balance text-highlighted [font-stretch:95%]">
        {{ challenge.title }}
      </h3>
      <p class="text-pretty text-toned">{{ challenge.description }}</p>
    </header>

    <!-- Uma casa por loja do desafio: a visita vira impressão, como no cartão. -->
    <ol class="grid auto-cols-fr grid-flow-col gap-3 px-5 pb-5">
      <li v-for="stop in challenge.stops" :key="stop.id" class="flex min-w-0 flex-col items-center gap-2 text-center">
        <span class="sr-only">{{ stop.label }}</span>
        <span class="size-14" aria-hidden="true">
          <StampImpression v-if="stop.visited" :icon="stop.icon" :tilt="stop.tilt" />
          <span
            v-else
            class="grid size-full place-items-center rounded-full border-[1.5px] border-dashed border-(--lagoa-slot) text-muted"
          >
            <UIcon :name="stop.icon" class="size-[42%]" />
          </span>
        </span>
        <span
          class="text-sm leading-tight font-medium text-pretty"
          :class="stop.visited ? 'text-highlighted' : 'text-muted'"
          aria-hidden="true"
        >
          {{ stop.shopName }}
        </span>
      </li>
    </ol>

    <footer class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-(--lagoa-rule) px-5 py-3.5 text-base">
      <span v-if="challenge.done" class="flex items-center gap-1.5 font-semibold text-success">
        <UIcon name="i-ph-check-circle" class="size-5" aria-hidden="true" />
        {{ doneLabel }}
      </span>
      <span v-else class="tabular font-semibold text-primary">{{ challenge.progress }}</span>
      <span v-if="challenge.deadline" class="tabular text-muted">{{ challenge.deadline }}</span>
    </footer>
  </article>
</template>
