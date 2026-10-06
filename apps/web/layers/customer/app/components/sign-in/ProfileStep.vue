<script setup lang="ts">
import type { SignUpFieldError } from '../../types/signIn'

interface Props {
  pending: boolean
  fieldError: SignUpFieldError | null
  /** Código de erro vindo da API (ex.: e-mail de outra conta). */
  errorCode: string | null
}

defineProps<Props>()
defineEmits<{ submit: [] }>()

const firstName = defineModel<string>('firstName', { required: true })
const email = defineModel<string>('email', { required: true })
const consent = defineModel<boolean>('consent', { required: true })
</script>

<template>
  <form class="flex flex-1 flex-col gap-6" novalidate @submit.prevent="$emit('submit')">
    <PageTitle :title="$t('signIn.profileTitle')" :lead="$t('signIn.profileLead')" />

    <UFormField :label="$t('signIn.nameLabel')" :hint="$t('signIn.nameHint')" :error="fieldError === 'firstNameRequired' ? $t('signIn.nameRequired') : undefined" name="firstName" size="xl">
      <UInput v-model="firstName" autocomplete="given-name" :placeholder="$t('signIn.namePlaceholder')" size="xl" class="w-full" autofocus />
    </UFormField>

    <UFormField
      :label="$t('signIn.emailLabel')"
      :hint="$t('signIn.emailHint')"
      :error="fieldError === 'invalidEmail' ? $t('signIn.emailInvalid') : errorCode === 'emailAlreadyUsed' ? $t('errors.emailAlreadyUsed') : undefined"
      name="email"
      size="xl"
    >
      <UInput v-model="email" type="email" inputmode="email" autocomplete="email" :placeholder="$t('signIn.emailPlaceholder')" size="xl" class="w-full" />
    </UFormField>

    <USwitch
      v-model="consent"
      size="lg"
      :label="$t('signIn.consentLabel')"
      :description="$t('signIn.consentHint')"
      :ui="{ root: 'items-start gap-3', label: 'text-base font-medium text-highlighted', description: 'text-base text-muted' }"
    />

    <div class="mt-auto flex flex-col gap-3">
      <p class="text-base text-muted">{{ $t('signIn.termsSignUp') }}</p>
      <UButton type="submit" size="xl" block :loading="pending" :label="$t('signIn.signUpSubmit')" />
    </div>
  </form>
</template>
