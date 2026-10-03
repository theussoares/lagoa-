<script setup lang="ts">
import { REWARD_TITLE_MAX_LENGTH } from '#shared/constants/domain'

interface Props {
  invalid: boolean
}

defineProps<Props>()
const title = defineModel<string>('title', { required: true })
</script>

<template>
  <UFormField
    :label="$t('program.reward.label')"
    :hint="$t('program.reward.hint', { max: REWARD_TITLE_MAX_LENGTH })"
    :error="invalid ? $t('program.errors.rewardTitle', { max: REWARD_TITLE_MAX_LENGTH }) : undefined"
    name="rewardTitle"
  >
    <UInput v-model="title" :maxlength="REWARD_TITLE_MAX_LENGTH" size="lg" class="w-full" :placeholder="$t('program.reward.placeholder')" />
  </UFormField>
</template>
