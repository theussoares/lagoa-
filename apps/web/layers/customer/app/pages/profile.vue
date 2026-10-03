<script setup lang="ts">
import type { Birthday } from '#shared/schemas/common'
import type { BirthdayAction } from '../types/profile'
import { formatBirthday, formatChangeableAt } from '../utils/birthdayModel'

definePageMeta({ path: '/perfil', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('profile.title')} · ${t('app.name')}` })

const { profile } = useCustomerServices()
const { signOut } = useCustomerSession()
const { state, reload, set } = useCustomerProfile()
const savingConsent = ref(false)
const birthdayPending = ref<BirthdayAction | null>(null)
const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))
const birthdayLockedUntil = computed(() => {
  if (state.value.status !== 'success') return null
  const changeableAt = state.value.value.birthdayChangeableAt
  return changeableAt === null ? null : formatChangeableAt(changeableAt)
})
const birthdayLabels = computed(() => ({
  legend: t('profile.birthday.legend'),
  help: t('profile.birthday.help'),
  day: t('profile.birthday.day'),
  month: t('profile.birthday.month'),
  placeholderDay: t('profile.birthday.placeholderDay'),
  placeholderMonth: t('profile.birthday.placeholderMonth'),
  partial: t('profile.birthday.partial'),
  locked: birthdayLockedUntil.value === null ? null : t('profile.birthday.lockedUntil', { date: birthdayLockedUntil.value }),
  save: t('profile.birthday.save'),
  remove: t('profile.birthday.remove'),
  removeTitle: t('profile.birthday.removeTitle'),
  removeDescription:
    birthdayLockedUntil.value === null
      ? t('profile.birthday.removeDescriptionFree')
      : t('profile.birthday.removeDescription', { date: birthdayLockedUntil.value }),
  removeConfirm: t('profile.birthday.removeConfirm'),
  removeCancel: t('profile.birthday.removeCancel'),
}))

watch(state, (current) => {
  if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
})

async function onConsentChange(granted: boolean): Promise<void> {
  savingConsent.value = true
  const result = await profile.setNotificationConsent(granted)
  savingConsent.value = false
  if (!result.ok) {
    toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
    return
  }
  set(result.value)
  toast.add({ color: 'success', icon: 'i-ph-check-circle', title: t('profile.consentSaved') })
}

async function saveBirthday(birthday: Birthday | null, action: BirthdayAction): Promise<void> {
  if (state.value.status !== 'success') return
  birthdayPending.value = action
  const result = await profile.updateProfile({ firstName: state.value.value.firstName, birthday })
  birthdayPending.value = null
  if (!result.ok) {
    toast.add({ color: 'error', icon: 'i-ph-warning-circle', title: t(`errors.${result.error.code}`) })
    if (result.error.code === 'birthdayLocked') void reload()
    return
  }
  set(result.value)
  const title = birthday === null ? t('profile.birthday.removed') : t('profile.birthday.saved', { date: formatBirthday(birthday) })
  toast.add({ color: 'success', icon: 'i-ph-check-circle', title })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageTitle :title="t('profile.title')" />

    <USkeleton v-if="state.status === 'loading'" class="h-56 rounded-(--radius-card)" />

    <WalletProblem
      v-else-if="state.status === 'error'"
      :message="t(`errors.${state.error.code}`)"
      :action="t('common.retry')"
      @retry="reload"
    />

    <dl v-else class="rounded-(--radius-card) bg-default px-5 shadow-(--lagoa-shadow-card)">
      <div class="flex flex-col gap-1 border-b border-(--lagoa-rule) py-4">
        <dt class="text-base text-muted">{{ t('profile.phoneLabel') }}</dt>
        <dd class="tabular text-lg font-semibold text-highlighted">{{ state.value.maskedPhone }}</dd>
      </div>
      <div class="py-4">
        <dt class="sr-only">{{ t('profile.consentLabel') }}</dt>
        <dd>
          <USwitch
            :model-value="state.value.consent.notifications"
            size="lg"
            :loading="savingConsent"
            :disabled="savingConsent"
            :label="t('profile.consentLabel')"
            :description="state.value.consent.notifications ? t('profile.consentOn') : t('profile.consentOff')"
            :ui="{ root: 'items-start gap-3', label: 'text-base font-medium text-highlighted', description: 'text-base text-muted' }"
            @update:model-value="onConsentChange"
          />
        </dd>
      </div>
    </dl>

    <section v-if="state.status === 'success'" aria-labelledby="birthday-title" class="flex flex-col gap-3">
      <h2 id="birthday-title" class="letreiro text-base text-toned">{{ t('profile.birthday.title') }}</h2>
      <div class="rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
        <ProfileBirthdayForm
          :birthday="state.value.birthday"
          :labels="birthdayLabels"
          :pending="birthdayPending"
          @save="saveBirthday($event, 'save')"
          @remove="saveBirthday(null, 'remove')"
        />
      </div>
    </section>

    <section aria-labelledby="appearance-title" class="flex flex-col gap-3">
      <h2 id="appearance-title" class="letreiro text-base text-toned">{{ t('profile.appearanceTitle') }}</h2>
      <div class="rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </div>
    </section>

    <UButton variant="outline" color="neutral" size="lg" block icon="i-ph-sign-out" :label="t('profile.signOut')" @click="signOut" />
  </div>
</template>
