<script setup lang="ts">
import type { ProgramMode } from '#shared/schemas/program'
import type { ClubSetupProgramForm } from '../../types/clubSetup'
import type { ProgramFieldErrors, ProgramFieldOptions } from '../../types/program'

interface Props {
  options: ProgramFieldOptions
  errors: ProgramFieldErrors
}

interface Emits {
  mode: [mode: ProgramMode]
}

defineProps<Props>()
const emit = defineEmits<Emits>()
const program = defineModel<ClubSetupProgramForm>('program', { required: true })

function update<K extends keyof ClubSetupProgramForm>(key: K, value: ClubSetupProgramForm[K]): void {
  program.value = { ...program.value, [key]: value }
}
</script>

<template>
  <PanelModule :title="$t('program.earn.title')">
    <ProgramEarnFields
      :rules="program.rules"
      @update:rules="update('rules', $event)"
      :unit="options.unit"
      :limits="options.limits"
      :errors="errors"
      :mode-locked="false"
      :target-changed="false"
      @mode="emit('mode', $event)"
    />
  </PanelModule>
  <PanelModule :title="$t('program.visitRules.title')">
    <ProgramVisitRulesFields
      :check-in="program.checkIn"
      :expiration="program.expirationPolicy"
      @update:check-in="update('checkIn', $event)"
      @update:expiration="update('expirationPolicy', $event)"
      :cooldown-options="options.cooldownOptions"
      :expiration-options="options.expirationOptions"
      :errors="errors"
    />
  </PanelModule>
</template>
