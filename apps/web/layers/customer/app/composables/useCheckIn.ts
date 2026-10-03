import type { CheckInCode } from '#shared/schemas/shop'
import type { Result } from '#shared/types/result'
import type { ErrorOf } from '#shared/types/errors'
import { parseCheckInCode, readCheckInQr } from '#shared/utils/checkInCode'
import type { CheckInSource, CheckInState, CheckIn } from '../types/checkIn'

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
