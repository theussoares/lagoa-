import type { VisitRegistered } from '#shared/schemas/visit'
import { parsePhoneNumber } from '#shared/utils/phone'
import type { CounterAction, CounterLaunchState, CounterLaunch } from '../types/counter'

/** Lançar visita no Balcão: digitou o celular, carimbou. */
export function useCounterLaunch(): CounterLaunch {
  const { counter } = useMerchantServices()
  const phone = ref('')
  const amount = ref('')
  const state = ref<CounterLaunchState>({ status: 'idle' })

  // Digitar o próximo celular apaga o aviso do lançamento anterior.
  watch(phone, (digits) => {
    if (digits !== '' && state.value.status !== 'pending') state.value = { status: 'idle' }
  })

  async function submit(action: CounterAction): Promise<VisitRegistered | null> {
    if (state.value.status === 'pending') return null
    const parsed = parsePhoneNumber(phone.value)
    if (!parsed.ok) {
      state.value = { status: 'error', code: parsed.error.code }
      return null
    }
    const amountCents = Number(amount.value)
    if (action.kind === 'amount' && !(amountCents > 0)) {
      state.value = { status: 'error', code: 'invalidAmount' }
      return null
    }
    state.value = { status: 'pending' }
    const result =
      action.kind === 'amount'
        ? await counter.registerAmount(parsed.value, amountCents)
        : await counter.registerVisit(parsed.value)
    if (!result.ok) {
      state.value = { status: 'error', code: result.error.code }
      return null
    }
    state.value = { status: 'success', result: result.value }
    phone.value = ''
    amount.value = ''
    return result.value
  }

  function clear(): void {
    phone.value = ''
    amount.value = ''
    if (state.value.status === 'error') state.value = { status: 'idle' }
  }

  return { phone, amount, state, submit, clear }
}
