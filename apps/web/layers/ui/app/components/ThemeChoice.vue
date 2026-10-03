<script setup lang="ts">
import type { ThemeChoiceLabels, ThemePreference } from '../types/theme'

interface Props {
  labels: ThemeChoiceLabels
}

defineProps<Props>()
const model = defineModel<ThemePreference>({ required: true })
const name = useId()

const OPTIONS: readonly ThemePreference[] = ['light', 'dark']
</script>

<template>
  <fieldset class="flex flex-col gap-3">
    <legend class="mb-3 text-base font-medium text-highlighted">{{ labels.legend }}</legend>
    <div class="grid grid-cols-2 gap-3">
      <label
        v-for="option in OPTIONS"
        :key="option"
        class="group relative flex cursor-pointer flex-col gap-2.5 rounded-(--radius-card) p-2.5 ring-1 ring-(--lagoa-rule) transition-shadow duration-(--lagoa-dur-fast) has-checked:ring-2 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary"
      >
        <input v-model="model" type="radio" :name="name" :value="option" class="sr-only" />
        <!-- Miniatura do cartão no papel de cada tema: a pessoa vê antes de escolher. -->
        <span
          aria-hidden="true"
          class="flex h-16 items-end gap-1 rounded-[calc(var(--radius-card)-4px)] p-2"
          :class="option === 'light' ? 'bg-mesa-100' : 'bg-mesa-950'"
        >
          <span
            class="flex h-10 flex-1 flex-wrap content-start gap-1 rounded-sm p-1.5"
            :class="option === 'light' ? 'bg-white' : 'bg-mesa-800'"
          >
            <span v-for="slot in 5" :key="slot" class="size-2.5 rounded-full" :class="slot <= 3 ? 'bg-primary' : option === 'light' ? 'ring-1 ring-mesa-400' : 'ring-1 ring-mesa-500'" />
          </span>
        </span>
        <span class="flex min-h-6 items-center gap-2 text-base font-semibold text-highlighted">
          <UIcon :name="option === 'light' ? 'i-ph-sun' : 'i-ph-moon'" class="size-5 shrink-0" aria-hidden="true" />
          {{ option === 'light' ? labels.light : labels.dark }}
          <UIcon name="i-ph-check-circle-fill" class="ml-auto size-5 text-primary opacity-0 group-has-checked:opacity-100" aria-hidden="true" />
        </span>
      </label>
    </div>
  </fieldset>
</template>
