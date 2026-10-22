import type { RewardLists } from '../types/reward'

/**
 * Aba Prêmios da Carteira: as mesmas listas da página Prêmios. A Carteira já sai da sessão quando os cartões
 * dizem `unauthorized`; aqui só falta o histórico (sem dobrar o `signOut`).
 */
export function useWalletRewardsTab(): RewardLists {
  const { signOut } = useCustomerSession()
  const lists = useRewardLists()

  const historyUnauthorized = computed(() => lists.historyState.status === 'error' && lists.historyState.error.code === 'unauthorized')
  watch(historyUnauthorized, (value) => {
    if (value) void signOut()
  })

  return lists
}
