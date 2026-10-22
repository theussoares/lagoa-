<script setup lang="ts">
import type { RewardLists } from '../../types/reward'

interface Props {
  screen: RewardLists
}

defineProps<Props>()
const { t } = useI18n()
</script>

<template>
  <RewardsSkeleton v-if="screen.cardsState.status === 'loading'" />

  <WalletProblem
    v-else-if="screen.cardsState.status === 'error'"
    :message="t(`errors.${screen.cardsState.error.code}`)"
    :action="t('common.retry')"
    @retry="screen.reloadCards"
  />

  <WalletEmpty
    v-else-if="!screen.hasCards"
    :title="t('rewards.emptyTitle')"
    :lead="t('wallet.empty')"
    :action="t('wallet.emptyAction')"
    to="/descobrir"
  />

  <template v-else>
    <RewardsReadySection :rewards="screen.ready" :closest="screen.closest" />
    <RewardsUpcomingSection v-if="screen.upcoming.length > 0" :rewards="screen.upcoming" />
    <RewardsHistorySection
      :status="screen.historyState.status"
      :entries="screen.history"
      :error-code="screen.historyState.status === 'error' ? screen.historyState.error.code : null"
      @retry="screen.reloadHistory"
    />
  </template>
</template>
