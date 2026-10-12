<script setup lang="ts">
definePageMeta({ path: '/perfil', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('profile.title')} · ${t('app.name')}` })
const cityHeaderImage = useCityHeaderImage()
const screen = useProfileScreen()
</script>

<template>
  <div>
    <ScreenHeader :title="t('profile.title')" :image="cityHeaderImage" />

    <div class="flex flex-col gap-6">
      <div class="relative -mt-10">
        <USkeleton v-if="screen.state.status === 'loading'" class="h-56 rounded-(--radius-card)" />

        <WalletProblem
          v-else-if="screen.state.status === 'error'"
          :message="t(`errors.${screen.state.error.code}`)"
          :action="t('common.retry')"
          @retry="screen.reload"
        />

        <ProfileAccountCard
          v-else
          :phone="screen.state.value.maskedPhone"
          :consent="screen.state.value.consent.notifications"
          :saving="screen.consentSaving"
          @change="screen.changeConsent"
        />
      </div>

      <section v-if="screen.state.status === 'success'" aria-labelledby="birthday-title" class="flex flex-col gap-3">
        <h2 id="birthday-title" class="letreiro text-base text-toned">{{ t('profile.birthday.title') }}</h2>
        <div class="rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
          <ProfileBirthdayForm
            :birthday="screen.state.value.birthday"
            :labels="screen.birthday.labels"
            :pending="screen.birthday.pending"
            @save="screen.birthday.save($event, 'save')"
            @remove="screen.birthday.save(null, 'remove')"
          />
        </div>
      </section>

      <section aria-labelledby="appearance-title" class="flex flex-col gap-3">
        <h2 id="appearance-title" class="letreiro text-base text-toned">{{ t('profile.appearanceTitle') }}</h2>
        <div class="rounded-(--radius-card) bg-default p-4 shadow-(--lagoa-shadow-card)">
          <ThemeChoice v-model="screen.theme" :labels="screen.themeLabels" />
        </div>
      </section>

      <UButton to="/ranking" variant="outline" color="neutral" size="lg" block icon="i-ph-trophy" :label="t('ranking.link')" />

      <ProfilePrivacySection :downloading="screen.exporter.pending" :erasing="screen.erasing" @download="screen.downloadData" @erase="screen.eraseAccount" />

      <UButton variant="outline" color="neutral" size="lg" block icon="i-ph-sign-out" :label="t('profile.signOut')" @click="screen.signOut" />
    </div>
  </div>
</template>
