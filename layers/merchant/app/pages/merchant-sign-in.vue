<script setup lang="ts">
import { LOGIN_CODE_LENGTH } from '#shared/constants/domain'
import { formatPhoneInput } from '#shared/utils/phone'
import type { ComponentPublicInstance } from 'vue'

definePageMeta({ path: '/balcao/entrar', layout: 'merchant-entry', middleware: 'merchant-guest' })

const { t } = useI18n()
const route = useRoute()
useHead({ title: () => `${t('merchantSignIn.pageTitle')} · ${t('app.name')}` })

const { step, pending, error, resendIn, requestCode, resendCode, verify, changePhone } = useMerchantSignIn()
const mockCode = useMockLoginHint()
const mockPhone = useMockMerchantPhone()

const phoneDraft = ref('')
const code = ref<number[]>([])
const codeField = useTemplateRef<ComponentPublicInstance>('codeField')

const steps = computed<[string, string, string]>(() => [
  t('merchantSignIn.steps.phone'),
  t('merchantSignIn.steps.stamp'),
  t('merchantSignIn.steps.redeem'),
])

const errorText = computed(() => {
  if (error.value === null) return undefined
  return error.value === 'notFound' ? t('merchantSignIn.notFound') : t(`errors.${error.value}`)
})
const phoneError = computed(() => (step.value.name === 'phone' ? errorText.value : undefined))
const codeError = computed(() => (step.value.name === 'code' ? errorText.value : undefined))
const sentTo = computed(() => (step.value.name === 'code' ? formatPhoneInput(step.value.phone) : ''))

function onPhoneInput(value: string | number): void {
  phoneDraft.value = formatPhoneInput(String(value))
}

async function submitCode(): Promise<void> {
  if (await verify(code.value.join(''))) {
    await navigateTo(safeMerchantReturnPath(route.query.para), { replace: true })
    return
  }
  code.value = []
  await nextTick()
  const root: unknown = codeField.value?.$el
  if (root instanceof HTMLElement) root.querySelector('input')?.focus()
}

function backToPhone(): void {
  code.value = []
  changePhone()
}
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
    <MerchantSignInAside :brand="t('app.name')" :title="t('merchantSignIn.asideTitle')" :steps="steps" />

    <div class="flex items-center justify-center px-6 py-10">
      <div class="flex w-full max-w-[420px] flex-col gap-8">
        <p class="letreiro text-xl text-highlighted lg:hidden">{{ t('app.name') }}</p>

        <form v-if="step.name === 'phone'" class="flex flex-col gap-6" novalidate @submit.prevent="requestCode(phoneDraft)">
          <div class="flex flex-col gap-2">
            <h1 class="text-[1.75rem] leading-[1.15] font-bold text-balance text-highlighted [font-stretch:90%]">
              {{ t('merchantSignIn.title') }}
            </h1>
            <p class="text-pretty text-toned">{{ t('merchantSignIn.lead') }}</p>
          </div>

          <UAlert
            v-if="mockCode && mockPhone"
            color="info"
            variant="subtle"
            icon="i-ph-info"
            :description="t('merchantSignIn.mockHint', { phone: mockPhone, code: mockCode })"
          />

          <UFormField :label="t('merchantSignIn.phoneLabel')" :hint="t('merchantSignIn.phoneHint')" :error="phoneError" name="phone" size="xl">
            <template #error="{ error: message }">
              <span v-if="message" class="flex items-start gap-1.5"><UIcon name="i-ph-warning-circle" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ message }}</span>
            </template>
            <UInput
              :model-value="phoneDraft"
              type="tel"
              inputmode="tel"
              autocomplete="tel-national"
              :placeholder="t('merchantSignIn.phonePlaceholder')"
              size="xl"
              class="w-full"
              :ui="{ base: 'tabular text-xl font-semibold tracking-wide placeholder:font-normal' }"
              autofocus
              @update:model-value="onPhoneInput"
            />
          </UFormField>

          <UButton type="submit" size="xl" block :loading="pending" :label="t('merchantSignIn.sendCode')" />
        </form>

        <form v-else class="flex flex-col gap-6" novalidate @submit.prevent="submitCode">
          <div class="flex flex-col gap-2">
            <h1 class="text-[1.75rem] leading-[1.15] font-bold text-highlighted [font-stretch:90%]">{{ t('merchantSignIn.codeTitle') }}</h1>
            <p class="text-toned">
              <i18n-t keypath="merchantSignIn.codeLead" scope="global">
                <template #phone>
                  <span class="tabular font-semibold whitespace-nowrap text-highlighted">{{ sentTo }}</span>
                </template>
              </i18n-t>
              {{ ' ' }}
              <UButton variant="link" class="min-h-0 p-0 align-baseline text-base" :label="t('merchantSignIn.changePhone')" @click="backToPhone" />
            </p>
          </div>

          <UAlert v-if="mockCode" color="info" variant="subtle" icon="i-ph-info" :description="t('signIn.mockHint', { code: mockCode })" />

          <UFormField ref="codeField" :label="t('merchantSignIn.codeLabel')" :error="codeError" name="code">
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

          <div class="flex flex-col gap-3">
            <UButton type="submit" size="xl" block :loading="pending" :label="t('merchantSignIn.submit')" />
            <UButton
              variant="ghost"
              color="neutral"
              block
              :disabled="resendIn > 0 || pending"
              :label="resendIn > 0 ? t('merchantSignIn.resendIn', { seconds: resendIn }) : t('merchantSignIn.resend')"
              @click="resendCode"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
