<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'
import type { ProgramMode, ProgramRules } from '#shared/schemas/program'
import type { ProgramFieldErrors } from '../../utils/programForm'
import type { EarnFieldsLabels } from '../../utils/programFormLabels'

interface Props {
  labels: EarnFieldsLabels
  errors: ProgramFieldErrors
  modeLocked: boolean
  /** Meta mudou e já há cartões: avisa que vale para quem está no meio. */
  targetChanged: boolean
}

interface Emits {
  mode: [mode: ProgramMode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const rules = defineModel<ProgramRules>('rules', { required: true })

const MODES: readonly ProgramMode[] = ['stamps', 'pointsPerCurrency', 'pointsPerVisit']

const modeItems = computed<RadioGroupItem[]>(() =>
  MODES.map((mode) => ({ ...props.labels.modes[mode], value: mode, disabled: props.modeLocked && mode !== rules.value.mode })),
)

function onMode(value: unknown): void {
  const mode = MODES.find((option) => option === value)
  if (mode !== undefined) emit('mode', mode)
}

function count(value: number | null | undefined): number {
  return value ?? 0
}

function setTarget(value: number | null | undefined): void {
  rules.value = { ...rules.value, target: count(value) }
}

function setRate(value: number | null | undefined): void {
  const current = rules.value
  if (current.mode === 'pointsPerCurrency') rules.value = { ...current, pointsPerReal: count(value) }
  else if (current.mode === 'pointsPerVisit') rules.value = { ...current, pointsPerVisit: count(value) }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UFormField :label="labels.mode" name="mode" :help="modeLocked ? labels.modeLocked : undefined">
      <URadioGroup
        :model-value="rules.mode"
        :items="modeItems"
        variant="card"
        orientation="vertical"
        :ui="{ item: 'min-h-11' }"
        @update:model-value="onMode"
      />
    </UFormField>

    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="labels.target" :hint="labels.targetHint" :error="errors.target ? labels.targetError : undefined" name="target">
        <UInputNumber :model-value="rules.target" :min="1" size="lg" class="w-full" @update:model-value="setTarget" />
      </UFormField>

      <UFormField
        v-if="rules.mode === 'pointsPerCurrency'"
        :label="labels.pointsPerReal"
        :error="errors.pointsPerReal ? labels.rateError : undefined"
        name="pointsPerReal"
      >
        <UInputNumber :model-value="rules.pointsPerReal" :min="1" size="lg" class="w-full" @update:model-value="setRate" />
      </UFormField>
      <UFormField
        v-else-if="rules.mode === 'pointsPerVisit'"
        :label="labels.pointsPerVisit"
        :error="errors.pointsPerVisit ? labels.rateError : undefined"
        name="pointsPerVisit"
      >
        <UInputNumber :model-value="rules.pointsPerVisit" :min="1" size="lg" class="w-full" @update:model-value="setRate" />
      </UFormField>
    </div>

    <p v-if="targetChanged" class="flex items-start gap-1.5 text-[0.9375rem] text-toned">
      <UIcon name="i-ph-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ labels.targetChangeNote }}
    </p>
  </div>
</template>
