import type { ShopId } from '#shared/schemas/ids'
import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { CheckInInputError, CheckInIntent, CheckInSource, CheckInState, CheckIn, CheckInInput } from '../types/checkIn'

type Attempt = { readonly intent: CheckInIntent; readonly source: CheckInSource }
type Settled = Extract<CheckInState, { status: 'earned' | 'joined' | 'error' }>

/** Código malformado conta como a intenção que o formato indica (visita ou cartaz). */
function intentOfInputError(error: CheckInInputError): CheckInIntent['kind'] {
  return error.code === 'invalidVisitQr' ? 'claim' : 'join'
}

export function useCheckIn(): CheckIn {
  const { checkIn: service, wallet } = useCustomerServices()
  const state = shallowRef<CheckInState>({ status: 'idle' })
  let last: Attempt | undefined

  async function cardOf(shopId: ShopId): Promise<WalletCard | null> {
    const card = await wallet.getCard(shopId)
    return card.ok ? card.value : null
  }

  async function settle(intent: CheckInIntent, source: CheckInSource): Promise<Settled> {
    if (intent.kind === 'join') {
      const joined = await service.joinShop(intent.code)
      if (!joined.ok) return { status: 'error', error: joined.error, source, intent: intent.kind }
      return { status: 'joined', result: joined.value, card: await cardOf(joined.value.shopId) }
    }
    const earned = await service.claimVisitQr(intent.credential)
    if (!earned.ok) return { status: 'error', error: earned.error, source, intent: intent.kind }
    return { status: 'earned', result: earned.value, card: await cardOf(earned.value.activity.shopId) }
  }

  async function send(attempt: Attempt): Promise<void> {
    last = attempt
    state.value = { status: 'submitting', source: attempt.source, intent: attempt.intent.kind }
    state.value = await settle(attempt.intent, attempt.source)
  }

  async function submit(input: CheckInInput, source: CheckInSource): Promise<void> {
    if (state.value.status === 'submitting') return
    if (!input.ok) {
      state.value = { status: 'error', error: input.error, source, intent: intentOfInputError(input.error) }
      return
    }
    await send({ intent: input.value, source })
  }

  async function retry(): Promise<void> {
    if (last !== undefined) await send(last)
  }

  function reset(): void {
    state.value = { status: 'idle' }
  }

  return { state, submit, retry, reset }
}
