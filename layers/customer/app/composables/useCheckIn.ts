import type { WalletCard } from '#shared/schemas/loyaltyCard'
import type { CheckInCode } from '#shared/schemas/shop'
import type { CheckInResult } from '#shared/schemas/visit'
import type { Result } from '#shared/types/result'
import type { ErrorOf } from '#shared/types/errors'
import { parseCheckInCode, readCheckInQr } from '#shared/utils/checkInCode'
import type { CheckInError } from '../services/CheckInService'
import type { CheckInSource } from '../utils/checkInModel'

export type CheckInState =
  | { status: 'idle' }
  | { status: 'submitting'; source: CheckInSource }
  /** `card` é o cartão já atualizado; sem ele (rede caiu no meio) a tela mostra só o resumo. */
  | { status: 'earned'; result: CheckInResult; card: WalletCard | null }
  | { status: 'error'; error: CheckInError; source: CheckInSource }

export interface CheckIn {
  state: Readonly<Ref<CheckInState>>
  /** `raw` é o conteúdo do QR, o texto digitado ou o `?loja=` do link. */
  submit: (raw: string, source: CheckInSource) => Promise<void>
  /** Repete o último código (depois de falha de rede). */
  retry: () => Promise<void>
  reset: () => void
}

function parse(raw: string, source: CheckInSource): Result<CheckInCode, ErrorOf<'invalidShopQr'>> {
  return source === 'camera' ? readCheckInQr(raw) : parseCheckInCode(raw)
}

export function useCheckIn(): CheckIn {
  const { checkIn: service, wallet } = useCustomerServices()
  const state = shallowRef<CheckInState>({ status: 'idle' })
  let last: { code: CheckInCode; source: CheckInSource } | undefined

  async function send(code: CheckInCode, source: CheckInSource): Promise<void> {
    last = { code, source }
    state.value = { status: 'submitting', source }
    const result = await service.checkIn(code)
    if (!result.ok) {
      state.value = { status: 'error', error: result.error, source }
      return
    }
    const card = await wallet.getCard(result.value.activity.shopId)
    state.value = { status: 'earned', result: result.value, card: card.ok ? card.value : null }
  }

  async function submit(raw: string, source: CheckInSource): Promise<void> {
    if (state.value.status === 'submitting') return
    const code = parse(raw, source)
    if (!code.ok) {
      state.value = { status: 'error', error: code.error, source }
      return
    }
    await send(code.value, source)
  }

  async function retry(): Promise<void> {
    if (last !== undefined) await send(last.code, last.source)
  }

  function reset(): void {
    state.value = { status: 'idle' }
  }

  return { state, submit, retry, reset }
}
