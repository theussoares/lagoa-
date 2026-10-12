import type { SeenBalances, WalletScreen } from '../types/wallet'
import { formatShortDate } from '#shared/utils/dateFormat'

/** Carteira: maço de cartões, caderneta recente e saudação. */
export function useWalletScreen(): WalletScreen {
  const { t } = useI18n()
  const translate = useTranslate()
  const { signOut } = useCustomerSession()
  const { state: cardsState, reload: reloadCards } = useWalletCards()
  const { state: activityState } = useWalletActivity()
  const { state: profileState } = useCustomerProfile()
  const seenStamps = useSeenStamps()
  const cityHeaderImage = useCityHeaderImage()

  const activeChoice = ref('')

  // O "visto" mora no aparelho: no servidor e na hidratação nada é "novo" (HTML igual nos dois lados); depois de montar,
  // a batida acontece nesta tela e o saldo vira visto.
  const seen = shallowRef<SeenBalances | null>(null)
  onMounted(() => {
    seen.value = seenStamps.snapshot()
  })

  const cards = computed(() => {
    if (cardsState.value.status !== 'success') return []
    const seenNow = seen.value
    return cardsState.value.value.map((card) =>
      toStampCardModel(card, { t: translate, seenBalance: seenNow === null ? card.balance : (seenNow[card.id] ?? 0), formatDate: formatShortDate }),
    )
  })
  const activeId = computed({
    get: () => activeChoice.value || cards.value[0]?.id || '',
    set: (id: string) => {
      activeChoice.value = id
    },
  })

  watch([cardsState, seen], ([state, seenNow]) => {
    if (state.status === 'success' && seenNow !== null) seenStamps.remember(Object.fromEntries(state.value.map((card) => [card.id, card.balance])))
  })

  const anyUnauthorized = computed(() =>
    [cardsState.value, activityState.value, profileState.value].some(
      (state) => state.status === 'error' && state.error.code === 'unauthorized',
    ),
  )
  watch(anyUnauthorized, (unauthorized) => {
    if (unauthorized) void signOut()
  })

  const firstName = computed(() => (profileState.value.status === 'success' ? profileState.value.value.firstName : null))
  const greeting = computed(() => (firstName.value ? t('wallet.greeting', { name: firstName.value }) : t('wallet.greetingAnonymous')))

  const ledger = computed(() => {
    if (activityState.value.status !== 'success') return []
    const now = new Date()
    const iconByShop = new Map<string, string>(
      cardsState.value.status === 'success' ? cardsState.value.value.map((card) => [card.shop.id, categoryIcon(card.shop.category)]) : [],
    )
    return activityState.value.value.map((activity) => toLedgerEntryModel(activity, now, translate, iconByShop))
  })

  return reactive({ cardsState, reloadCards, activityState, cards, activeId, greeting, ledger, cityHeaderImage })
}
