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
</script>

<template>
  <PanelModule :title="$t('program.earn.title')">
    <ProgramEarnFields
      v-model:rules="program.rules"
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
      v-model:check-in="program.checkIn"
      v-model:expiration="program.expirationPolicy"
      :cooldown-options="options.cooldownOptions"
      :expiration-options="options.expirationOptions"
      :errors="errors"
    />
  </PanelModule>
</template>
