import { formatShortDate } from '#shared/utils/dateFormat'
import type { RedemptionTicketState } from '#layers/ui/app/types/redemption'
import type { RewardRedemptionScreen } from '../types/redemption'

/** Resgate: pede o código do cartão da rota e mostra o bilhete até o balcão confirmar. */
export function useRewardRedemptionScreen(): RewardRedemptionScreen {
  const { t } = useI18n()
  const translate = useTranslate()
  const route = useRoute()
  const router = useRouter()
  const cityHeaderImage = useCityHeaderImage()

  const { signOut } = useCustomerSession()
  const { state, remaining, request } = useRewardRedemption(String(route.params.cardId))
  const { state: cardsState } = useWalletCards()

  const card = computed(() => {
    if (cardsState.value.status !== 'success') return undefined
    return cardsState.value.value.find((item) => item.id === route.params.cardId)
  })

  const redemption = computed(() => (state.value.status === 'ready' ? state.value.redemption : undefined))
  const ticket = computed<RedemptionTicketState | undefined>(() =>
    redemption.value ? toRedemptionTicketState(redemption.value, remaining.value, translate) : undefined,
  )
  const announcement = computed(() => (ticket.value?.kind === 'active' ? minutesLeftAnnouncement(remaining.value, translate) : ''))
  const heldUntil = computed(() =>
    card.value?.rewardExpiresAt ? t('redemption.heldUntil', { date: formatShortDate(card.value.rewardExpiresAt) }) : null,
  )

  const errorText = computed(() => {
    if (state.value.status !== 'error') return ''
    const { error } = state.value
    return error.code === 'rewardNotReady' ? t('errors.rewardNotReady', { remaining: error.remaining }) : t(`errors.${error.code}`)
  })
  const title = computed(() => (ticket.value?.kind === 'redeemed' ? t('redemption.redeemedTitle') : t('redemption.title')))
  // Quem chegou pela aba Prêmios volta para ela; o resto volta para a carteira.
  const back =
    router.options.history.state.back === '/premios'
      ? { to: '/premios', label: t('redemption.backToRewards') }
      : { to: '/carteira', label: t('redemption.back') }
  const canRetry = computed(() => state.value.status === 'error' && state.value.error.code === 'network')

  watch(state, (current) => {
    if (current.status === 'error' && current.error.code === 'unauthorized') void signOut()
  })

  return reactive({ state, card, redemption, ticket, announcement, heldUntil, errorText, title, back, canRetry, request, cityHeaderImage })
}
