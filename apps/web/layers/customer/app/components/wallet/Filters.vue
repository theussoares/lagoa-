<script setup lang="ts">
import type { WalletFilterOption } from '../../types/wallet'

interface Props {
  options: readonly WalletFilterOption[]
  filter: string
  query: string
  searchLabel: string
  searchPlaceholder: string
  clearLabel: string
}

interface Emits {
  'update:filter': [value: string]
  'update:query': [value: string]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <UInput
      :model-value="query"
      type="search"
      size="xl"
      icon="i-ph-magnifying-glass"
      :placeholder="searchPlaceholder"
      :aria-label="searchLabel"
      autocomplete="off"
      class="w-full"
      :ui="{ base: 'min-h-11' }"
      @update:model-value="emit('update:query', String($event))"
    >
      <template v-if="query" #trailing>
        <ActionButton role="quiet" size="lg" icon="i-ph-x" :aria-label="clearLabel" @click="emit('update:query', '')" />
      </template>
    </UInput>

    <div role="group" :aria-label="searchLabel" class="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :aria-pressed="filter === option.value"
        class="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-semibold transition-colors duration-(--lagoa-dur-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="filter === option.value ? 'border-transparent bg-primary text-inverted' : 'border-(--lagoa-rule) bg-default text-toned'"
        @click="emit('update:filter', option.value)"
      >
        {{ option.label }}
        <span class="tabular text-sm" :class="filter === option.value ? 'text-inverted' : 'text-muted'">{{ option.count }}</span>
      </button>
    </div>
  </div>
</template>
