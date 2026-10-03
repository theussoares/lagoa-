import { LoyaltyCardIdSchema } from '#shared/schemas/ids'
import type { Redemption } from '#shared/schemas/redemption'
import type { ErrorOf, TransportError } from '#shared/types/errors'

/** Quanto a tela espera para perguntar de novo se o balcão já entregou o prêmio. */
const STATUS_POLL_MS = 3000

export type RewardRedemptionError = ErrorOf<'notFound' | 'rewardNotReady'> | TransportError

export type RewardRedemptionState =
  | { status: 'loading' }
  | { status: 'error'; error: RewardRedemptionError }
  | { status: 'ready'; redemption: Redemption }

export interface RewardRedemption {
  state: Readonly<Ref<RewardRedemptionState>>
  /** Segundos até o código vencer; o servidor continua sendo quem decide. */
  remaining: Readonly<Ref<number>>
  /** Gera um código novo (ou recupera o que ainda vale). */
  request: () => Promise<void>
}

/** `rawCardId` vem da rota; id malformado é tratado como cartão que não existe. */
export function useRewardRedemption(rawCardId: string): RewardRedemption {
  const { redemption: service } = useCustomerServices()
  const state = shallowRef<RewardRedemptionState>({ status: 'loading' })
  const { remaining, start } = useCountdown()
  let poll: ReturnType<typeof setInterval> | undefined

  function show(redemption: Redemption): void {
    state.value = { status: 'ready', redemption }
    start(secondsUntil(redemption.expiresAt, new Date()))
    clearInterval(poll)
    if (redemption.status === 'active') poll = setInterval(refresh, STATUS_POLL_MS)
  }

  async function request(): Promise<void> {
    const cardId = LoyaltyCardIdSchema.safeParse(rawCardId)
    if (!cardId.success) {
      state.value = { status: 'error', error: { code: 'notFound', entity: 'card' } }
      return
    }
    state.value = { status: 'loading' }
    const result = await service.requestCode(cardId.data)
    if (result.ok) show(result.value)
    else state.value = { status: 'error', error: result.error }
  }

  async function refresh(): Promise<void> {
    if (state.value.status !== 'ready') return
    const current = state.value.redemption
    const result = await service.getRedemption(current.id)
    // Falha de rede no meio da contagem não derruba o código da tela; a próxima tentativa resolve.
    if (!result.ok) return
    if (result.value.status !== current.status) show(result.value)
  }

  // A contagem local chegou a zero: confirma com o servidor em vez de declarar vencido sozinho.
  watch(remaining, (seconds) => {
    if (seconds === 0) void refresh()
  })

  onMounted(request)
  onScopeDispose(() => clearInterval(poll))

  return { state, remaining, request }
}
