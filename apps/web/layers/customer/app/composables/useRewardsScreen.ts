import { formatShortDate } from '#shared/utils/dateFormat'
import type { RewardsScreen } from '../types/reward'

/** Prêmios: o que já dá para resgatar, o que falta e o histórico de resgates. */
export function useRewardsScreen(): RewardsScreen {
  const translate = useTranslate()
  const cityHeaderImage = useCityHeaderImage()

  const { signOut } = useCustomerSession()
  const { state: cardsState, reload: reloadCards } = useWalletCards()
  const { state: historyState, reload: reloadHistory } = useRewardHistory()

  const groups = computed(() => (cardsState.value.status === 'success' ? groupRewards(cardsState.value.value) : undefined))
  const ready = computed(() => groups.value?.ready.map((card) => toReadyRewardModel(card, translate, formatShortDate)) ?? [])
  const upcoming = computed(() => groups.value?.upcoming.map((card) => toUpcomingRewardModel(card, translate)) ?? [])
  const closest = computed(() => {
    const card = groups.value?.upcoming[0]
    return card ? closestRewardLine(card, translate) : null
  })
  const hasCards = computed(() => ready.value.length + upcoming.value.length > 0)

  const history = computed(() => {
    if (historyState.value.status !== 'success') return []
    const now = new Date()
    return historyState.value.value.map((activity) => toLedgerEntryModel(activity, now, translate))
  })

  const unauthorized = computed(() =>
    [cardsState.value, historyState.value].some((state) => state.status === 'error' && state.error.code === 'unauthorized'),
  )
  watch(unauthorized, (value) => {
    if (value) void signOut()
  })

  return reactive({ cardsState, historyState, reloadCards, reloadHistory, ready, upcoming, closest, hasCards, history, cityHeaderImage })
}
