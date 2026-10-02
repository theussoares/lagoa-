import { RedemptionCodeSchema } from '#shared/schemas/redemption'
import type { RedemptionPreview } from '#shared/schemas/redemption'
import type { CounterEntry } from '#shared/schemas/visit'
import type { DomainErrorCode } from '#shared/types/errors'

export type RedemptionCheckState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'error'; code: DomainErrorCode }
  | { status: 'preview'; preview: RedemptionPreview }
  | { status: 'confirming'; preview: RedemptionPreview }
  | { status: 'delivered'; rewardTitle: string }

export interface RedemptionCheck {
  code: Ref<string[]>
  state: Readonly<Ref<RedemptionCheckState>>
  validate: () => Promise<void>
  /** Entrega o prêmio. Devolve a linha da caderneta, ou null. */
  confirm: () => Promise<CounterEntry | null>
  reset: () => void
}

/** Conferir o canhoto: o servidor diz se o código vale; o Balcão só mostra e confirma a entrega. */
export function useRedemptionCheck(): RedemptionCheck {
  const { counter } = useMerchantServices()
  const code = ref<string[]>([])
  const state = ref<RedemptionCheckState>({ status: 'idle' })

  watch(code, (chars) => {
    const busy = state.value.status === 'checking' || state.value.status === 'confirming'
    if (chars.some((char) => char !== '') && !busy && state.value.status !== 'preview') state.value = { status: 'idle' }
  })

  async function validate(): Promise<void> {
    if (state.value.status === 'checking') return
    const parsed = RedemptionCodeSchema.safeParse(code.value.join(''))
    // Formato errado nem vai ao servidor: a resposta seria a mesma de código inexistente.
    if (!parsed.success) {
      fail('redemptionInvalid')
      return
    }
    state.value = { status: 'checking' }
    const result = await counter.validateRedemption(parsed.data)
    if (result.ok) state.value = { status: 'preview', preview: result.value }
    else fail(result.error.code)
  }

  // Casas limpas depois do erro: o atendente redigita o código do começo.
  function fail(errorCode: DomainErrorCode): void {
    state.value = { status: 'error', code: errorCode }
    code.value = []
  }

  async function confirm(): Promise<CounterEntry | null> {
    if (state.value.status !== 'preview') return null
    const { preview } = state.value
    state.value = { status: 'confirming', preview }
    const result = await counter.confirmRedemption(preview.redemptionId)
    if (!result.ok) {
      state.value = { status: 'error', code: result.error.code }
      return null
    }
    state.value = { status: 'delivered', rewardTitle: preview.rewardTitle }
    code.value = []
    return result.value
  }

  function reset(): void {
    code.value = []
    state.value = { status: 'idle' }
  }

  return { code, state, validate, confirm, reset }
}
