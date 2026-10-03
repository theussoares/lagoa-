<script setup lang="ts">
import type { RadioGroupItem } from '@nuxt/ui'
import type { ProgramMode, ProgramRules, ProgramUnit } from '#shared/schemas/program'
import type { ProgramFieldErrors, ProgramFieldLimits } from '../../types/program'

interface Props {
  unit: ProgramUnit
  limits: ProgramFieldLimits
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
const { t } = useI18n()

const MODES: readonly ProgramMode[] = ['stamps', 'pointsPerCurrency', 'pointsPerVisit']

const modeItems = computed<RadioGroupItem[]>(() =>
  MODES.map((mode) => ({
    label: t(`program.earn.modes.${mode}.label`),
    description: t(`program.earn.modes.${mode}.description`),
    value: mode,
    disabled: props.modeLocked && mode !== rules.value.mode,
  })),
)

function onMode(value: unknown): void {
  const mode = MODES.find((option) => option === value)
  if (mode !== undefined) emit('mode', mode)
}

function setTarget(value: number | null | undefined): void {
  rules.value = { ...rules.value, target: value ?? 0 }
}

function setRate(value: number | null | undefined): void {
  const current = rules.value
  if (current.mode === 'pointsPerCurrency') rules.value = { ...current, pointsPerReal: value ?? 0 }
  else if (current.mode === 'pointsPerVisit') rules.value = { ...current, pointsPerVisit: value ?? 0 }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Travado não é rádio apagado: é o tipo escolhido, com a etiqueta dizendo que não muda mais. -->
    <div v-if="modeLocked" class="flex flex-col gap-1.5">
      <p class="text-sm font-medium text-default">{{ $t('program.earn.mode') }}</p>
      <div class="flex items-start justify-between gap-4 rounded-(--ui-radius) border border-(--lagoa-rule) px-4 py-3">
        <span class="flex min-w-0 flex-col">
          <span class="font-semibold text-highlighted">{{ $t(`program.earn.modes.${rules.mode}.label`) }}</span>
          <span class="text-[0.9375rem] text-muted">{{ $t(`program.earn.modes.${rules.mode}.description`) }}</span>
        </span>
        <StampTag :label="$t('program.card.locked')" icon="i-ph-lock-simple" />
      </div>
      <p class="text-[0.9375rem] text-muted">{{ $t('program.earn.modeLocked') }}</p>
    </div>
    <UFormField v-else :label="$t('program.earn.mode')" name="mode">
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
      <UFormField
        :label="$t(`program.earn.target.${unit}`)"
        :hint="$t('program.earn.targetHint', { ...limits.target })"
        :error="errors.target ? $t('program.errors.range', { ...limits.target }) : undefined"
        name="target"
      >
        <UInputNumber :model-value="rules.target" :min="limits.target.min" :max="limits.target.max" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setTarget" />
      </UFormField>

      <UFormField
        v-if="rules.mode === 'pointsPerCurrency'"
        :label="$t('program.earn.pointsPerReal')"
        :error="errors.pointsPerReal ? $t('program.errors.range', { ...limits.rate }) : undefined"
        name="pointsPerReal"
      >
        <UInputNumber :model-value="rules.pointsPerReal" :min="limits.rate.min" :max="limits.rate.max" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setRate" />
      </UFormField>
      <UFormField
        v-else-if="rules.mode === 'pointsPerVisit'"
        :label="$t('program.earn.pointsPerVisit')"
        :error="errors.pointsPerVisit ? $t('program.errors.range', { ...limits.rate }) : undefined"
        name="pointsPerVisit"
      >
        <UInputNumber :model-value="rules.pointsPerVisit" :min="limits.rate.min" :max="limits.rate.max" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setRate" />
      </UFormField>
    </div>

    <p v-if="targetChanged" class="flex items-start gap-1.5 text-[0.9375rem] text-toned">
      <UIcon name="i-ph-info" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ $t('program.earn.targetChangeNote') }}
    </p>
  </div>
</template>
