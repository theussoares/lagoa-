<script setup lang="ts">
import type { ClubSetupProgramForm } from '../../types/clubSetup'
import type { ProgramFieldErrors, ProgramFieldOptions } from '../../types/program'

interface Props {
  options: ProgramFieldOptions
  errors: ProgramFieldErrors
}

defineProps<Props>()
const program = defineModel<ClubSetupProgramForm>('program', { required: true })
</script>

<template>
  <PanelModule :title="$t('program.reward.title')">
    <ProgramRewardTitleField v-model:title="program.reward.title" :invalid="errors.rewardTitle === true" />
  </PanelModule>
  <PanelModule :title="$t('program.bonus.title')">
    <ProgramBonusFields v-model:bonus="program.bonusRules" :unit="options.unit" :limits="options.limits" :errors="errors" />
  </PanelModule>
</template>
