<script setup lang="ts">
import type { CheckInPolicy, ExpirationPolicy } from '#shared/schemas/program'
import type { ProgramFieldErrors, VisitRulesLabels } from '../../types/program'

interface Props {
  labels: VisitRulesLabels
  errors: ProgramFieldErrors
}

defineProps<Props>()
const checkIn = defineModel<CheckInPolicy>('checkIn', { required: true })
const expiration = defineModel<ExpirationPolicy>('expiration', { required: true })

const expirationValue = computed(() => (expiration.value.kind === 'never' ? 'never' : String(expiration.value.months)))

function setCooldown(value: unknown): void {
  const hours = Number(value)
  if (Number.isInteger(hours) && hours > 0) checkIn.value = { ...checkIn.value, cooldownHours: hours }
}

function setExpiration(value: unknown): void {
  if (value === 'never') {
    expiration.value = { kind: 'never' }
    return
  }
  const months = Number(value)
  if (Number.isInteger(months) && months > 0) expiration.value = { kind: 'afterInactivity', months }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <USwitch
      :model-value="checkIn.enabled"
      :label="labels.checkIn.label"
      :description="labels.checkIn.description"
      size="lg"
      class="min-h-11"
      @update:model-value="checkIn = { ...checkIn, enabled: $event }"
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="labels.cooldown" :help="labels.cooldownHint" :error="errors.cooldownHours ? labels.optionError : undefined" name="cooldownHours">
        <USelect :model-value="String(checkIn.cooldownHours)" :items="[...labels.cooldownOptions]" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setCooldown" />
      </UFormField>
      <UFormField :label="labels.expiration" :help="labels.expirationHint" :error="errors.expirationMonths ? labels.optionError : undefined" name="expiration">
        <USelect :model-value="expirationValue" :items="[...labels.expirationOptions]" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setExpiration" />
      </UFormField>
    </div>
  </div>
</template>
