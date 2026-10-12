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
        <NuxtLink
          to="/perfil"
          class="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/50 transition-colors duration-(--lagoa-dur-fast) hover:bg-white/25 focus-visible:outline-white"
          :aria-label="t('wallet.profileLink')"
        >
          <UIcon name="i-ph-user-circle" class="size-7" aria-hidden="true" />
        </NuxtLink>
      </template>
    </ScreenHeader>

    <div class="flex flex-col gap-8">
      <section :aria-label="t('wallet.stackLabel')" class="relative -mt-10">
        <WalletStackSkeleton v-if="screen.cardsState.status === 'loading'" />

        <WalletProblem
          v-else-if="screen.cardsState.status === 'error'"
          :message="t(`errors.${screen.cardsState.error.code}`)"
          :action="t('common.retry')"
          @retry="screen.reloadCards"
        />

        <WalletEmpty
          v-else-if="screen.cards.length === 0"
          :title="t('wallet.emptyTitle')"
          :lead="t('wallet.empty')"
          :action="t('wallet.emptyAction')"
          to="/descobrir"
        />

        <CardStack
          v-else
          :cards="screen.cards"
          :active-id="screen.activeId"
          :show-label="(card) => t('wallet.showCard', { shop: card.shopName })"
          :more-label="(hidden) => t('wallet.showMore', { count: hidden }, hidden)"
          @select="screen.activeId = $event"
        >
          <template #actions="{ card }">
            <UButton v-if="card.rewardReady" :to="`/premios/${card.id}`" color="secondary" size="xl" block icon="i-ph-gift" :label="t('wallet.redeem')" />
          </template>
        </CardStack>
      </section>

      <section v-if="screen.cards.length > 0 || screen.ledger.length > 0" class="flex flex-col gap-3" aria-labelledby="ledger-title">
        <h2 id="ledger-title" class="type-h2">
          {{ t('wallet.ledgerTitle') }}
        </h2>
        <div class="rounded-(--radius-card) bg-default px-5 py-1 shadow-(--lagoa-shadow-card)">
          <USkeleton v-if="screen.activityState.status === 'loading'" class="my-3 h-24" />
          <LedgerList v-else-if="screen.ledger.length > 0" :entries="screen.ledger" />
          <p v-else class="py-4 text-muted">{{ t('wallet.ledgerEmpty') }}</p>
        </div>
      </section>
    </div>
  </div>
</template>
