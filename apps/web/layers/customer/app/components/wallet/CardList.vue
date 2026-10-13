<script setup lang="ts">
import type { StampCardModel } from '#layers/ui/app/types/wallet'

interface Props {
  cards: readonly StampCardModel[]
  expandedId: string
  /** "Abrir o cartão de {loja}" / "Fechar o cartão de {loja}". */
  toggleLabel: (card: StampCardModel, expanded: boolean) => string
}

interface Emits {
  toggle: [id: string]
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const listId = useId()
</script>

<template>
  <ul class="flex flex-col gap-3">
    <li v-for="(card, index) in cards" :key="card.id" :style="{ '--i': Math.min(index + 1, 6) }" class="card rise overflow-hidden">
      <h3>
        <button
          type="button"
          class="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          :aria-expanded="card.id === expandedId"
          :aria-controls="`${listId}-${card.id}`"
          :aria-label="toggleLabel(card, card.id === expandedId)"
          @click="emit('toggle', card.id)"
        >
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-(--color-sol-100) text-(--color-sol-700) dark:bg-(--color-sol-900) dark:text-(--color-sol-200)" aria-hidden="true">
            <UIcon :name="card.icon" class="size-6" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="font-display truncate text-lg leading-tight font-bold text-highlighted">{{ card.shopName }}</span>
            <span class="flex items-center gap-1.5 truncate text-base" :class="card.rewardReady ? 'font-semibold text-secondary' : 'text-muted'">
              <UIcon v-if="card.rewardReady" name="i-ph-gift-bold" class="size-4 shrink-0" aria-hidden="true" />
              {{ card.peek }}
            </span>
          </span>
          <span class="tabular shrink-0 text-base text-toned" aria-hidden="true">{{ card.progress }}</span>
          <UIcon
            name="i-ph-caret-down"
            class="size-5 shrink-0 text-muted transition-transform duration-(--lagoa-dur-fast)"
            :class="card.id === expandedId ? 'rotate-180' : ''"
            aria-hidden="true"
          />
        </button>
      </h3>
      <div v-if="card.id === expandedId" :id="`${listId}-${card.id}`" role="region" :aria-label="card.shopName" class="px-1 pb-1">
        <StampCard :card="card" :header="false" flat>
          <template #actions>
            <slot name="actions" :card="card" />
          </template>
        </StampCard>
      </div>
    </li>
  </ul>
</template>
