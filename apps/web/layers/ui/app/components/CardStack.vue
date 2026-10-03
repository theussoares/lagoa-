<script setup lang="ts">
import type { StampCardModel } from '../types/wallet'

interface Props {
  cards: readonly StampCardModel[]
  activeId: string
  /** Rótulo acessível de cada borda: "Mostrar cartão de {loja}". */
  showLabel: (card: StampCardModel) => string
  /** "Mostrar mais 2 cartões" quando o maço passa do que cabe. */
  moreLabel: (hidden: number) => string
}

interface Emits {
  select: [id: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const MAX_PEEKS = 3
const expanded = ref(false)

const stack = computed(() => stackPeeks(props.cards, props.activeId, expanded.value, MAX_PEEKS))
const active = computed(() => stack.value.active)
const peeks = computed(() => stack.value.peeks)
const hidden = computed(() => stack.value.hidden)
</script>

<template>
  <div v-if="active" class="flex flex-col">
    <Transition name="deal" mode="out-in">
      <StampCard :key="active.id" :card="active" class="relative z-10">
        <template #actions>
          <slot name="actions" :card="active" />
        </template>
      </StampCard>
    </Transition>

    <ul class="flex flex-col">
      <li
        v-for="(card, index) in peeks"
        :key="card.id"
        class="relative -mt-3"
        :style="{ zIndex: 9 - Math.min(index, 8), marginInline: `${Math.min(index + 1, 3) * 6}px` }"
      >
        <button
          type="button"
          class="peek flex min-h-15 w-full items-end justify-between gap-3 rounded-b-(--radius-card) bg-default px-5 pt-6 pb-3 text-left shadow-(--lagoa-shadow-card) transition-transform duration-(--lagoa-dur-fast) active:translate-y-px"
          :aria-label="showLabel(card)"
          @click="emit('select', card.id)"
        >
          <span class="font-display min-w-0 truncate text-base font-bold text-highlighted">{{ card.shopName }}</span>
          <span
            class="tabular flex shrink-0 items-center gap-1.5 text-base font-semibold"
            :class="card.rewardReady ? 'text-secondary' : 'text-muted'"
          >
            <UIcon v-if="card.rewardReady" name="i-ph-gift-bold" class="size-4" aria-hidden="true" />
            {{ card.peek }}
          </span>
        </button>
      </li>
    </ul>

    <UButton
      v-if="hidden > 0"
      variant="ghost"
      color="neutral"
      class="mt-3 self-center"
      :label="moreLabel(hidden)"
      trailing-icon="i-ph-caret-down"
      @click="expanded = true"
    />
  </div>
</template>

<style scoped>
.deal-enter-active {
  transition: transform var(--lagoa-dur-base) var(--ease-out-expo), opacity var(--lagoa-dur-base) var(--ease-out-expo);
}

.deal-leave-active {
  transition: transform 130ms ease-in, opacity 130ms ease-in;
}

.deal-enter-from {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.deal-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.peek:hover {
  transform: translateY(2px);
}

@media (prefers-reduced-motion: reduce) {
  .deal-enter-active,
  .deal-leave-active {
    transition: opacity var(--lagoa-dur-fast) linear;
  }

  .deal-enter-from {
    transform: none;
  }
}
</style>
