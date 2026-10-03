import type { ComputedRef, Ref } from 'vue'
import { formatShortDate } from '#shared/utils/dateFormat'
import { stampTilt } from '#layers/ui/app/utils/stampTilt'
import { REWARD_STAMP_ICON } from '#layers/ui/app/utils/stampIcons'
import { seenBalanceBefore, toCheckInEarnedModel } from '../utils/checkInModel'
import type { CheckInEarnedView, CheckInHeroStamp, CheckInState } from '../types/checkIn'

const FALLBACK_STAMP_ICON = 'i-ph-seal-check-bold'

type EarnedState = Extract<CheckInState, { status: 'earned' }>

/** O que a tela de carimbo ganho mostra, derivado do estado do check-in. */
export function useCheckInEarnedView(state: Readonly<Ref<CheckInState>>): ComputedRef<CheckInEarnedView | null> {
  const translate = useTranslate()

  return computed(() => {
    const current = state.value
    if (current.status !== 'earned') return null
    const card = current.card
      ? toStampCardModel(current.card, { t: translate, seenBalance: seenBalanceBefore(current.result), formatDate: formatShortDate })
      : null
    const text = toCheckInEarnedModel(current.result, card?.summary ?? null, new Date(), translate)
    return {
      text,
      card,
      heroStamp: heroStampOf(current, text.moment === 'reward', card?.icon),
      rewardCardId: current.result.card.rewardReady ? current.result.card.cardId : null,
    }
  })
}

function heroStampOf(current: EarnedState, reward: boolean, cardIcon: string | undefined): CheckInHeroStamp {
  const { cardId, balance } = current.result.card
  return {
    icon: reward ? REWARD_STAMP_ICON : (cardIcon ?? FALLBACK_STAMP_ICON),
    tilt: stampTilt(cardId, balance),
    tone: reward ? 'reward' : 'ink',
  }
}
