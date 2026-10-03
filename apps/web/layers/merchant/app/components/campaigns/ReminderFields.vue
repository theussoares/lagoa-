<script setup lang="ts">
import type { ReminderDraft } from '#shared/schemas/campaign'
import type { ReminderFieldErrors, ReminderFieldLimits, ReminderFieldsLabels } from '../../utils/reminderForm'

interface Props {
  labels: ReminderFieldsLabels
  limits: ReminderFieldLimits
  errors: ReminderFieldErrors
}

defineProps<Props>()
const draft = defineModel<ReminderDraft>('draft', { required: true })

function setMessage(value: string): void {
  draft.value = { ...draft.value, message: value }
}

function setBonus(value: number | null | undefined): void {
  draft.value = { ...draft.value, bonusUnits: value ?? 0 }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UFormField :label="labels.message" :hint="labels.messageHint" :error="errors.message ? labels.messageError : undefined" name="message">
      <UTextarea
        :model-value="draft.message"
        :maxlength="limits.messageMax"
        :rows="3"
        autoresize
        size="lg"
        class="w-full"
        @update:model-value="setMessage(String($event))"
      />
    </UFormField>
    <UFormField
      :label="labels.bonus"
      :description="labels.bonusHint"
      :error="errors.bonusUnits ? labels.bonusError : undefined"
      name="bonusUnits"
      class="max-w-xs"
    >
      <UInputNumber
        :model-value="draft.bonusUnits"
        :min="limits.bonusMin"
        :max="limits.bonusMax"
        size="lg"
        :ui="{ base: 'min-h-11' }"
        class="w-full"
        @update:model-value="setBonus"
      />
    </UFormField>
  </div>
</template>
