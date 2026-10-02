<script setup lang="ts">
definePageMeta({ path: '/perfil', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
const toast = useToast()
useHead({ title: () => `${t('profile.title')} · ${t('app.name')}` })

const { profile } = useCustomerServices()
const { signOut } = useCustomerSession()
const { state, reload, set } = useCustomerProfile()
const savingConsent = ref(false)
const theme = useThemePreference()
const themeLabels = computed(() => ({ legend: t('theme.legend'), light: t('theme.light'), dark: t('theme.dark') }))

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

    <section aria-labelledby="appearance-title" class="flex flex-col gap-3">
      <h2 id="appearance-title" class="letreiro text-base text-toned">{{ t('profile.appearanceTitle') }}</h2>
      <div class="rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
        <ThemeChoice v-model="theme" :labels="themeLabels" />
      </div>
    </section>

    <UButton variant="outline" color="neutral" size="lg" block icon="i-ph-sign-out" :label="t('profile.signOut')" @click="signOut" />
  </div>
</template>
