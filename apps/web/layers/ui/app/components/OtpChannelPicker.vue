<script setup lang="ts" generic="T extends string = string">
import type { OtpChannelPickerOption } from '../types/channel'

interface Props {
  legend: string
  options: readonly OtpChannelPickerOption<T>[]
  disabled?: boolean
}

defineProps<Props>()
const model = defineModel<T>({ required: true })
const name = useId()
</script>

<template>
  <fieldset class="flex flex-col gap-2" :disabled="disabled">
    <legend class="text-sm font-medium text-toned">{{ legend }}</legend>
    <div class="grid grid-cols-2 gap-2.5">
      <label
        v-for="option in options"
        :key="option.value"
        class="group relative flex cursor-pointer items-center justify-between gap-2 rounded-(--radius-card) border border-(--lagoa-rule) bg-surface px-3 py-2.5 transition-all duration-(--lagoa-dur-fast) has-checked:border-primary has-checked:bg-primary/5 has-checked:ring-1 has-checked:ring-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary hover:border-highlighted"
        :class="{ 'opacity-60 cursor-not-allowed': disabled }"
      >
        <input
          v-model="model"
          type="radio"
          :name="name"
          :value="option.value"
          class="sr-only"
          :disabled="disabled"
        />
        <span class="flex items-center gap-2 text-sm font-semibold text-highlighted">
          <UIcon v-if="option.icon" :name="option.icon" class="size-4 shrink-0 text-toned group-has-checked:text-primary" aria-hidden="true" />
          {{ option.label }}
        </span>
        <UIcon
          name="i-ph-check-circle-fill"
          class="size-4 shrink-0 text-primary opacity-0 group-has-checked:opacity-100 transition-opacity"
          aria-hidden="true"
        />
      </label>
    </div>
  </fieldset>
</template>
