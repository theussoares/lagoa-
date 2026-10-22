<script setup lang="ts">
definePageMeta({ path: '/carteira', layout: 'customer', middleware: 'customer-auth' })

const { t } = useI18n()
useHead({ title: () => `${t('wallet.title')} · ${t('app.name')}` })
const screen = useWalletScreen()
</script>

<template>
  <div>
    <ScreenHeader :title="screen.greeting" :lead="t('wallet.lead')" :image="screen.cityHeaderImage">
      <template #actions>
        <HeaderIconLink to="/perfil" :label="t('wallet.profileLink')" icon="i-ph-user-circle" icon-size="lg" />
      </template>
    </ScreenHeader>

    <WalletSectionTabs v-if="screen.sectionsEnabled" :selected="screen.section" class="relative -mt-10 mb-6" />
    <WalletRewardsContainer v-if="screen.section === 'rewards'" />

    <div v-else class="flex flex-col gap-8">
      <section :aria-label="t('wallet.stackLabel')" class="relative" :class="{ '-mt-10': !screen.sectionsEnabled }">
        <WalletCardsContainer :screen="screen" />
      </section>

      <WalletInstallInvite
        v-if="screen.installInvite.platform"
        :platform="screen.installInvite.platform"
        :title="t('install.title')"
        :lead="screen.installInvite.platform === 'ios' ? t('install.leadIos') : t('install.lead')"
        :action="screen.installInvite.platform === 'ios' ? t('install.actionIos') : t('install.action')"
        :dismiss-label="t('install.dismiss')"
        :steps-title="t('install.stepsTitle')"
        :steps="[t('install.steps.share'), t('install.steps.add'), t('install.steps.confirm')]"
        @install="screen.installInvite.install()"
        @dismiss="screen.installInvite.dismiss()"
      />

      <section v-if="screen.cards.length > 0 || screen.ledger.length > 0" class="flex flex-col gap-3" aria-labelledby="ledger-title">
        <h2 id="ledger-title" class="type-h2">
          {{ t('wallet.ledgerTitle') }}
        </h2>
        <div class="card px-5 py-1">
          <USkeleton v-if="screen.activityState.status === 'loading'" class="my-3 h-24" />
          <LedgerList v-else-if="screen.ledger.length > 0" :entries="screen.ledger" />
          <p v-else class="py-4 text-muted">{{ t('wallet.ledgerEmpty') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
