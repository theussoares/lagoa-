<script setup lang="ts">
import type { ClubSetupFormStep, ClubSetupScreen } from '../../types/clubSetup'
import { MERCHANT_SIGN_IN_PATH } from '../../composables/useMerchantSession'

interface Props {
  step: ClubSetupFormStep
  creating: boolean
  submitError: ClubSetupScreen['submitError']
}

interface Emits {
  submit: []
  back: []
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <form class="flex min-w-0 flex-col gap-6 lg:col-span-7" novalidate @submit.prevent="emit('submit')">
    <PageTitle :title="$t(`clubSetup.${step}.title`)" :lead="$t(`clubSetup.${step}.lead`)" focusable />

    <fieldset :disabled="creating" class="flex min-w-0 flex-col gap-5">
      <slot />
    </fieldset>

    <InkNote
      v-if="submitError"
      tone="error"
      icon="i-ph-warning-circle"
      :description="submitError === 'phoneAlreadyUsed' ? $t('clubSetup.phoneAlreadyUsed') : $t(`errors.${submitError}`)"
      :actions="submitError === 'signUpExpired' ? [{ label: $t('clubSetup.confirmPhoneAgain'), to: MERCHANT_SIGN_IN_PATH }] : []"
      live
    />

    <div class="flex items-center justify-between gap-3 border-t border-(--lagoa-rule) pt-5">
      <UButton
        v-if="step !== 'shop'"
        variant="outline"
        color="neutral"
        size="lg"
        icon="i-ph-arrow-left"
        :label="$t('clubSetup.back')"
        :disabled="creating"
        @click="emit('back')"
      />
      <span v-else />
      <UButton
        type="submit"
        size="lg"
        :trailing-icon="step === 'reward' ? 'i-ph-seal-check' : 'i-ph-arrow-right'"
        :label="step === 'reward' ? $t('clubSetup.create') : $t(`clubSetup.continue.${step}`)"
        :loading="creating"
      />
    </div>
  </form>
</template>
