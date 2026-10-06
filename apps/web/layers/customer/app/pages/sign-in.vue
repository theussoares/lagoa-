<script setup lang="ts">
import { LOGIN_CODE_LENGTH } from '#shared/constants/domain'
import { formatPhoneInput } from '#shared/utils/phone'
import type { ComponentPublicInstance } from 'vue'

definePageMeta({ path: '/entrar', layout: 'customer-entry', middleware: 'customer-guest' })

const { t } = useI18n()
const route = useRoute()
useHead({ title: () => `${t('signIn.pageTitle')} · ${t('app.name')}` })

const { step, pending, error, fieldError, greeting, resendIn, requestCode, resendCode, verify, signUp, changePhone } = useCustomerSignIn()
const toast = useToast()

const phoneDraft = ref('')
const code = ref<number[]>([])
const draft = reactive({ firstName: '', email: '', notificationConsent: false })
const codeField = useTemplateRef<ComponentPublicInstance>('codeField')

function codeFieldElement(): HTMLElement | null {
  const element: unknown = codeField.value?.$el
  return element instanceof HTMLElement ? element : null
}

const errorText = computed(() => (error.value === null ? undefined : t(`errors.${error.value}`)))
const phoneError = computed(() => (step.value.name === 'phone' ? errorText.value : undefined))
const codeError = computed(() => (step.value.name === 'code' ? errorText.value : undefined))
const sentTo = computed(() => (step.value.name === 'code' ? formatPhoneInput(step.value.phone) : ''))

function onPhoneInput(value: string | number): void {
  phoneDraft.value = formatPhoneInput(String(value))
}

const welcomeTitle = computed(() => {
  if (greeting.value === null) return ''
  const { kind, name } = greeting.value
  if (kind === 'new') return t('signIn.welcomeNew', { name })
  return name === null ? t('signIn.welcomeBackAnonymous') : t('signIn.welcomeBack', { name })
})

async function enter(): Promise<void> {
  toast.add({ title: welcomeTitle.value, icon: 'i-ph-hand-waving', color: 'success' })
  await navigateTo(returnLocation(route.query.para, route.hash), { replace: true })
}

async function submitProfile(): Promise<void> {
  if (await signUp(draft)) await enter()
}

async function submitCode(): Promise<void> {
  const outcome = await verify(code.value.join(''))
  if (outcome === 'signedIn') return enter()
  if (outcome === 'signUp') return
  code.value = []
  // Depois do erro o foco volta para a primeira casa: dá para redigitar sem tocar.
  await nextTick()
  codeFieldElement()?.querySelector('input')?.focus()
}

function backToPhone(): void {
  code.value = []
  changePhone()
}
</script>

<template>
  <div class="flex flex-1 flex-col gap-8">
    <SignInHero v-if="step.name === 'phone'" :brand="t('app.name')" :caption="t('signIn.heroCaption')" />

    <form v-if="step.name === 'phone'" class="flex flex-1 flex-col gap-6" novalidate @submit.prevent="requestCode(phoneDraft)">
      <PageTitle :title="t('signIn.title')" :lead="t('signIn.lead')" />

      <UFormField :label="t('signIn.phoneLabel')" :hint="t('signIn.phoneHint')" :error="phoneError" name="phone" size="xl">
        <template #error="{ error: message }">
          <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
        </template>
        <UInput
          :model-value="phoneDraft"
          type="tel"
          inputmode="tel"
          autocomplete="tel-national"
          :placeholder="t('signIn.phonePlaceholder')"
          size="xl"
          class="w-full"
          :ui="{ base: 'tabular text-xl font-semibold tracking-wide placeholder:font-normal' }"
          autofocus
          @update:model-value="onPhoneInput"
        />
      </UFormField>

      <UButton type="submit" size="xl" block :loading="pending" :label="t('signIn.sendCode')" class="mt-auto" />
    </form>

    <SignInProfileStep
      v-else-if="step.name === 'profile'"
      v-model:first-name="draft.firstName"
      v-model:email="draft.email"
      v-model:consent="draft.notificationConsent"
      :pending="pending"
      :field-error="fieldError"
      :error-code="error"
      @submit="submitProfile"
    />

    <form v-else class="flex flex-1 flex-col gap-6" novalidate @submit.prevent="submitCode">
      <PageTitle :title="t('signIn.codeTitle')">
        <p class="type-lead">
          <i18n-t keypath="signIn.codeLead" scope="global">
            <template #phone>
              <span class="tabular font-semibold whitespace-nowrap text-highlighted">{{ sentTo }}</span>
            </template>
          </i18n-t>
          {{ ' ' }}
          <UButton variant="link" class="relative min-h-0 p-0 align-baseline text-base after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']" :label="t('signIn.changePhone')" @click="backToPhone" />
        </p>
      </PageTitle>

      <UFormField ref="codeField" :label="t('signIn.codeLabel')" :error="codeError" name="code">
        <template #error="{ error: message }">
          <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
        </template>
        <UPinInput
          v-model="code"
          :length="LOGIN_CODE_LENGTH"
          type="number"
          otp
          size="xl"
          autofocus
          :disabled="pending"
          :highlight="codeError !== undefined"
          :color="codeError ? 'error' : 'primary'"
          @complete="submitCode"
        />
      </UFormField>

      <div class="mt-auto flex flex-col gap-3">
        <p class="text-base text-muted">{{ t('signIn.smsDelayHint') }}</p>
        <p class="text-base text-muted">{{ t('signIn.terms') }}</p>
        <UButton type="submit" size="xl" block :loading="pending" :label="t('signIn.submit')" />
        <UButton
          variant="ghost"
          color="neutral"
          block
          :disabled="resendIn > 0 || pending"
          :label="resendIn > 0 ? t('signIn.resendIn', { seconds: resendIn }) : t('signIn.resend')"
          @click="resendCode"
        />
      </div>
    </form>
  </div>
</template>
