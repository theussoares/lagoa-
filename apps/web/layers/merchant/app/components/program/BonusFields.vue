<script setup lang="ts">
import type { BonusRules } from '#shared/schemas/program'
import { IsoDateSchema } from '#shared/schemas/common'
import type { ProgramFieldErrors, BonusFieldsLabels, ProgramFieldLimits } from '../../types/program'

interface Props {
  labels: BonusFieldsLabels
  limits: ProgramFieldLimits
  errors: ProgramFieldErrors
}

defineProps<Props>()
const bonus = defineModel<BonusRules>('bonus', { required: true })

function toggle(rule: keyof BonusRules, enabled: boolean): void {
  bonus.value = { ...bonus.value, [rule]: { ...bonus.value[rule], enabled } }
}

function setUnits(rule: 'welcomeBonus' | 'referralBonus', value: number | null | undefined): void {
  bonus.value = { ...bonus.value, [rule]: { ...bonus.value[rule], units: value ?? 0 } }
}

function setSurpriseDate(value: string | number): void {
  const parsed = IsoDateSchema.safeParse(String(value))
  bonus.value = { ...bonus.value, surpriseDay: { ...bonus.value.surpriseDay, date: parsed.success ? parsed.data : null } }
}
</script>

<template>
  <div class="flex flex-col divide-y divide-(--lagoa-rule)">
    <div class="flex flex-col gap-3 pb-4">
      <USwitch
        :model-value="bonus.welcomeBonus.enabled"
        :label="labels.welcome.label"
        :description="labels.welcome.description"
        size="lg"
        class="min-h-11"
        @update:model-value="toggle('welcomeBonus', $event)"
      />
      <UFormField
        v-if="bonus.welcomeBonus.enabled"
        :label="labels.welcomeUnits"
        :error="errors.welcomeUnits ? labels.welcomeUnitsError : undefined"
        name="welcomeUnits"
        class="ml-12 max-w-48"
      >
        <UInputNumber :model-value="bonus.welcomeBonus.units" :min="limits.welcomeUnits.min" :max="limits.welcomeUnits.max" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setUnits('welcomeBonus', $event)" />
      </UFormField>
    </div>

    <div class="py-4">
      <USwitch
        :model-value="bonus.birthdayMultiplier.enabled"
        :label="labels.birthday.label"
        :description="labels.birthday.description"
        size="lg"
        class="min-h-11"
        @update:model-value="toggle('birthdayMultiplier', $event)"
      />
    </div>

    <div class="flex flex-col gap-3 py-4">
      <USwitch
        :model-value="bonus.referralBonus.enabled"
        :label="labels.referral.label"
        :description="labels.referral.description"
        size="lg"
        class="min-h-11"
        @update:model-value="toggle('referralBonus', $event)"
      />
      <UFormField
        v-if="bonus.referralBonus.enabled"
        :label="labels.referralUnits"
        :error="errors.referralUnits ? labels.referralUnitsError : undefined"
        name="referralUnits"
        class="ml-12 max-w-48"
      >
        <UInputNumber :model-value="bonus.referralBonus.units" :min="limits.referralUnits.min" :max="limits.referralUnits.max" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setUnits('referralBonus', $event)" />
      </UFormField>
    </div>

    <div class="flex flex-col gap-3 pt-4">
      <USwitch
        :model-value="bonus.surpriseDay.enabled"
        :label="labels.surprise.label"
        :description="labels.surprise.description"
        size="lg"
        class="min-h-11"
        @update:model-value="toggle('surpriseDay', $event)"
      />
      <UFormField
        v-if="bonus.surpriseDay.enabled"
        :label="labels.surpriseDate"
        :error="errors.surpriseDate ? labels.surpriseDateError : undefined"
        name="surpriseDate"
        class="ml-12 max-w-56"
      >
        <UInput type="date" size="lg" :ui="{ base: 'min-h-11' }" :model-value="bonus.surpriseDay.date ?? ''" class="w-full" @update:model-value="setSurpriseDate" />
      </UFormField>
      <p class="text-[0.9375rem] text-muted">{{ labels.noStacking }}</p>
    </div>
  </div>
</template>
