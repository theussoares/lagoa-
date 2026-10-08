import type { AsyncResult } from '#layers/core/app/types/asyncResult'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { CustomerProfile } from '#shared/schemas/customer'
import type { Challenge } from '#shared/schemas/discover'
import type { Ranking } from '#shared/schemas/ranking'
import type { ShopSummary } from '#shared/schemas/shop'
import type { WalletActivity } from '#shared/schemas/visit'
import type { TransportError } from '#shared/types/errors'

const RECENT_ACTIVITY_LIMIT = 8
const REWARD_HISTORY_LIMIT = 20

export function useWalletCards(): AsyncResult<WalletCard[], TransportError> {
  const { wallet } = useCustomerServices()
  return useAsyncQuery('wallet-cards', () => wallet.listCards())
}

export function useWalletActivity(): AsyncResult<WalletActivity[], TransportError> {
  const { wallet } = useCustomerServices()
  return useAsyncQuery('wallet-activity', () => wallet.listActivity(RECENT_ACTIVITY_LIMIT))
}

export function useRewardHistory(): AsyncResult<WalletActivity[], TransportError> {
  const { wallet } = useCustomerServices()
  return useAsyncQuery('wallet-rewards', () => wallet.listRewardHistory(REWARD_HISTORY_LIMIT))
}

export function useCustomerProfile(): AsyncResult<CustomerProfile, TransportError> {
  const { profile } = useCustomerServices()
  return useAsyncQuery('customer-profile', () => profile.getProfile())
}

export function useDiscoverShops(): AsyncResult<ShopSummary[], TransportError> {
  const { discover } = useCustomerServices()
  return useAsyncQuery('discover-shops', () => discover.listShops())
}

export function useDiscoverChallenges(): AsyncResult<Challenge[], TransportError> {
  const { discover } = useCustomerServices()
  return useAsyncQuery('discover-challenges', () => discover.listChallenges())
}

export function useRanking(): AsyncResult<Ranking, TransportError> {
  const { ranking } = useCustomerServices()
  return useAsyncQuery('ranking', () => ranking.getRanking())
}
