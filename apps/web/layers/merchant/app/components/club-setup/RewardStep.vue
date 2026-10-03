<script setup lang="ts">
import type { ClubSetupProgramForm } from '../../types/clubSetup'
import type { ProgramFieldErrors, ProgramFieldOptions } from '../../types/program'

interface Props {
  options: ProgramFieldOptions
  errors: ProgramFieldErrors
}

defineProps<Props>()
const program = defineModel<ClubSetupProgramForm>('program', { required: true })

function update<K extends keyof ClubSetupProgramForm>(key: K, value: ClubSetupProgramForm[K]): void {
  program.value = { ...program.value, [key]: value }
}

function updateTitle(title: string): void {
  update('reward', { ...program.value.reward, title })
}
</script>

<template>
  <PanelModule :title="$t('program.reward.title')">
    <ProgramRewardTitleField
      :title="program.reward.title"
      @update:title="updateTitle" :invalid="errors.rewardTitle === true" />
  </PanelModule>
  <PanelModule :title="$t('program.bonus.title')">
    <ProgramBonusFields
      :bonus="program.bonusRules"
      @update:bonus="update('bonusRules', $event)" :unit="options.unit" :limits="options.limits" :errors="errors" />
  </PanelModule>
</template>
