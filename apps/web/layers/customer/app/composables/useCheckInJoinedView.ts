import type { ComputedRef, Ref } from 'vue'
import { formatShortDate } from '#shared/utils/dateFormat'
import { toCheckInJoinedModel } from '../utils/checkInModel'
import { toStampCardModel } from '../utils/walletCardModel'
import type { CheckInJoinedView, CheckInState } from '../types/checkIn'

/** O que a tela "entrou no clube" mostra, derivado do estado do check-in. */
export function useCheckInJoinedView(state: Readonly<Ref<CheckInState>>): ComputedRef<CheckInJoinedView | null> {
  const translate = useTranslate()

  return computed(() => {
    const current = state.value
    if (current.status !== 'joined') return null
    const card = current.card
      ? toStampCardModel(current.card, { t: translate, seenBalance: current.card.balance, formatDate: formatShortDate })
      : null
    return {
      text: toCheckInJoinedModel(current.result, current.card, translate),
      // A dica do cartão ("peça o QR da visita") já é o `next` da tela: não repetir.
      card: card === null ? null : { ...card, note: null },
    }
  })
}
