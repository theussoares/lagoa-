<script setup lang="ts">
import type { CheckInPolicy, ExpirationPolicy } from '#shared/schemas/program'
import type { SelectOption } from '#layers/ui/app/types/form'
import type { ProgramFieldErrors } from '../../types/program'
import { cooldownSelectValue, withCooldownValue } from '../../utils/programForm'

interface Props {
  cooldownOptions: readonly SelectOption[]
  expirationOptions: readonly SelectOption[]
  errors: ProgramFieldErrors
}

defineProps<Props>()
const checkIn = defineModel<CheckInPolicy>('checkIn', { required: true })
const expiration = defineModel<ExpirationPolicy>('expiration', { required: true })

const expirationValue = computed(() => (expiration.value.kind === 'never' ? 'never' : String(expiration.value.months)))

function setCooldown(value: unknown): void {
  const next = withCooldownValue(checkIn.value, value)
  if (next !== null) checkIn.value = next
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
      :label="$t('program.visitRules.checkIn.label')"
      :description="$t('program.visitRules.checkIn.description')"
      size="lg"
      class="min-h-11"
      @update:model-value="checkIn = { ...checkIn, enabled: $event }"
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField :label="$t('program.visitRules.cooldown')" :help="$t('program.visitRules.cooldownHint')" :error="errors.cooldownHours ? $t('program.errors.option') : undefined" name="cooldownHours">
        <USelect :model-value="cooldownSelectValue(checkIn)" :items="[...cooldownOptions]" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setCooldown" />
      </UFormField>
      <UFormField :label="$t('program.visitRules.expiration')" :help="$t('program.visitRules.expirationHint')" :error="errors.expirationMonths ? $t('program.errors.option') : undefined" name="expiration">
        <USelect :model-value="expirationValue" :items="[...expirationOptions]" size="lg" :ui="{ base: 'min-h-11' }" class="w-full" @update:model-value="setExpiration" />
      </UFormField>
    </div>
  </div>
</template>
