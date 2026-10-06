import { VISIT_QR_STATUS_POLL_MS } from '#shared/constants/domain'
import type { VisitQr, VisitQrIssueRequest } from '#shared/schemas/visitQr'
import type { DomainErrorCode } from '#shared/types/errors'
import type { Result } from '#shared/types/result'
import type { CounterAction } from '../types/counter'
import type { VisitQrControl, VisitQrState } from '../types/visitQr'
import { visitQrRemainingSeconds } from '../utils/visitQrModels'

const CLOCK_TICK_MS = 1000
/** Falha de passagem na consulta periódica: o QR continua na tela e a próxima consulta tenta de novo. */
const TRANSIENT_POLL_ERRORS: readonly DomainErrorCode[] = ['network', 'rateLimited']

/**
 * QR da visita no Balcão: emite, acompanha o uso (consulta a cada 3 s enquanto aguarda o cliente), conta o tempo pelo
 * relógio do servidor e cancela. O token fica só em memória: o servidor guarda o hash e não devolve de novo.
 */
export function useVisitQr(): VisitQrControl {
  const { visitQr, visitQrTesting } = useMerchantServices()
  const amount = ref('')
  const state = shallowRef<VisitQrState>({ status: 'idle' })
  const localNow = ref(Date.now())
  let ticker: ReturnType<typeof setInterval> | undefined
  let poller: ReturnType<typeof setInterval> | undefined
  let pollInFlight = false

  const awaitingCustomer = computed(() => state.value.status === 'showing' && state.value.qr.status === 'active')
  // Só conta enquanto aguarda o cliente: usado, vencido ou cancelado não têm tempo a correr.
  const remaining = computed(() => {
    const current = state.value
    if (current.status !== 'showing' || current.qr.status !== 'active') return 0
    return visitQrRemainingSeconds(current.qr.expiresAt, localNow.value, current.skewMs)
  })

  function stopTimers(): void {
    clearInterval(ticker)
    clearInterval(poller)
  }

  /** Só vale se o QR na tela ainda é o mesmo que foi consultado (cancelar ou gerar outro no meio do caminho). */
  function applyLookup(requested: VisitQr, result: Result<VisitQr, { code: DomainErrorCode }>, tolerateTransient: boolean): void {
    const latest = state.value
    if (latest.status !== 'showing' || latest.qr.id !== requested.id) return
    if (result.ok) {
      state.value = { ...latest, qr: result.value }
      return
    }
    if (tolerateTransient && TRANSIENT_POLL_ERRORS.includes(result.error.code)) return
    state.value = { status: 'error', code: result.error.code }
  }

  async function poll(): Promise<void> {
    const current = state.value
    if (current.status !== 'showing' || pollInFlight) return
    pollInFlight = true
    const result = await visitQr.getVisitQr(current.qr.id)
    pollInFlight = false
    applyLookup(current.qr, result, true)
  }

  watch(
    awaitingCustomer,
    (active) => {
      stopTimers()
      if (!active) return
      localNow.value = Date.now()
      ticker = setInterval(() => {
        localNow.value = Date.now()
      }, CLOCK_TICK_MS)
      poller = setInterval(() => void poll(), VISIT_QR_STATUS_POLL_MS)
    },
    { flush: 'sync' },
  )

  // Zerou aqui: quem diz se venceu, foi usado ou continua valendo é o servidor.
  watch(remaining, (seconds) => {
    if (seconds === 0 && awaitingCustomer.value) void poll()
  })

  async function issue(action: CounterAction): Promise<void> {
    if (state.value.status === 'issuing') return
    const amountCents = Number(amount.value)
    if (action.kind === 'amount' && !(amountCents > 0)) {
      state.value = { status: 'error', code: 'invalidAmount' }
      return
    }
    const request: VisitQrIssueRequest = action.kind === 'amount' ? { amountCents } : {}
    state.value = { status: 'issuing' }
    const sentAt = Date.now()
    const result = await visitQr.issueVisitQr(request)
    if (!result.ok) {
      state.value = { status: 'error', code: result.error.code }
      return
    }
    const { token, ...qr } = result.value
    const receivedAt = Date.now()
    // O servidor carimbou `createdAt` em algum ponto da ida e volta: o meio dela é a melhor estimativa.
    const skewMs = Date.parse(qr.createdAt) - (sentAt + receivedAt) / 2
    state.value = { status: 'showing', qr, token, skewMs }
    amount.value = ''
  }

  async function cancel(): Promise<void> {
    const current = state.value
    if (current.status !== 'showing') return
    applyLookup(current.qr, await visitQr.cancelVisitQr(current.qr.id), false)
  }

  async function simulateClaim(): Promise<void> {
    const current = state.value
    if (visitQrTesting === null || current.status !== 'showing') return
    applyLookup(current.qr, await visitQrTesting.simulateClaim(current.qr.id), false)
  }

  function reset(): void {
    state.value = { status: 'idle' }
    amount.value = ''
  }

  onScopeDispose(stopTimers)

  return {
    amount,
    state,
    remaining,
    issue,
    cancel,
    reset,
    simulateClaim: visitQrTesting === null ? null : simulateClaim,
  }
}
