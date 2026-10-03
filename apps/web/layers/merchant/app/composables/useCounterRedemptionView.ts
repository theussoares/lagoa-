import type { CounterFocus, CounterLedger, CounterRedemptionView, RedemptionCheck } from '../types/counter'
import { toRedemptionPreviewModel } from '../utils/counterModels'

/** Resgate no Balcão: o canhoto conferido, e quando devolver o foco às casas do código. */
export function useCounterRedemptionView(redemption: RedemptionCheck, ledger: CounterLedger, focus: CounterFocus): CounterRedemptionView {
  const translate = useTranslate()

  const preview = computed(() => {
    const state = redemption.state.value
    if (state.status !== 'preview' && state.status !== 'confirming') return null
    return toRedemptionPreviewModel(state.preview, state.status === 'confirming', translate)
  })

  async function complete(): Promise<void> {
    await redemption.validate()
    // As casas já foram limpas junto com o erro; o foco só vale depois do DOM atualizado.
    if (redemption.state.value.status === 'error') focus('redemptionCode')
  }

  async function deliver(): Promise<void> {
    const entry = await redemption.confirm()
    if (entry !== null) ledger.prepend(entry)
  }

  function cancel(): void {
    redemption.reset()
    focus('redemptionCode')
  }

  return reactive({
    code: redemption.code,
    status: computed(() => redemption.state.value.status),
    errorCode: computed(() => (redemption.state.value.status === 'error' ? redemption.state.value.code : null)),
    preview,
    deliveredReward: computed(() => (redemption.state.value.status === 'delivered' ? redemption.state.value.rewardTitle : null)),
    complete,
    deliver,
    cancel,
  })
}
