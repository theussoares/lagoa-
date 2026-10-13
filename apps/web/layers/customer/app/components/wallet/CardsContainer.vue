<script setup lang="ts">
import type { WalletFilter, WalletScreen } from '../../types/wallet'

interface Props {
  screen: WalletScreen
}

defineProps<Props>()
const { t } = useI18n()
const filterOptions = (screen: WalletScreen) =>
  WALLET_FILTERS.map((value) => ({ value, label: t(`wallet.filters.${value}`), count: screen.filterCounts[value] }))
</script>

<template>
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

  <div v-else class="flex flex-col gap-4">
    <WalletFilters
      :options="filterOptions(screen)"
      :filter="screen.filter"
      :query="screen.query"
      :search-label="t('wallet.searchLabel')"
      :search-placeholder="t('wallet.searchPlaceholder')"
      :clear-label="t('wallet.searchClear')"
      @update:filter="screen.filter = $event as WalletFilter"
      @update:query="screen.query = $event"
    />
    <WalletCardList
      v-if="screen.visibleCards.length > 0"
      :cards="screen.visibleCards"
      :expanded-id="screen.expandedId"
      :toggle-label="(card, expanded) => t(expanded ? 'wallet.closeCard' : 'wallet.openCard', { shop: card.shopName })"
      @toggle="screen.toggleCard"
    >
      <template #actions="{ card }">
        <ActionButton v-if="card.rewardReady" role="reward" :to="`/premios/${card.id}`" block icon="i-ph-gift" :label="t('wallet.redeem')" />
        <ActionButton
          v-if="card.contact"
          role="secondary"
          :to="card.contact.href"
          target="_blank"
          external
          block
          icon="i-ph-whatsapp-logo"
          :label="card.contact.label"
          :aria-label="card.contact.accessibleLabel"
        />
      </template>
    </WalletCardList>
    <p v-else class="rounded-(--radius-card) border-2 border-dashed border-(--lagoa-slot) px-5 py-4 text-pretty text-toned" role="status">
      {{ t('wallet.noMatch') }}
    </p>
  </div>
</template>
