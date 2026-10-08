import type { Program } from '#shared/schemas/program'
import type { TransportError } from '#shared/types/errors'
import { formatCurrency } from '#shared/utils/currency'
import type { AsyncResult } from '#layers/core/app/types/asyncResult'
import { amountDigits, counterActionFor } from '../utils/counterAction'
import { toVisitQrCode, toVisitQrDisplayModel, toVisitQrIssueText } from '../utils/visitQrModels'
import type { CounterAction, CounterFocus, CounterFocusTarget, CounterLedger } from '../types/counter'
import type { CounterVisitQrView, VisitQrControl } from '../types/visitQr'

function initialFocusTarget(action: CounterAction): CounterFocusTarget {
  return action.kind === 'amount' ? 'amount' : 'issueVisitQr'
}

/** Painel do QR da visita: o que o botão faz, os textos, o recibo do uso e quando devolver o foco. */
export function useVisitQrPanel(
  program: AsyncResult<Program, TransportError>,
  control: VisitQrControl,
  ledger: CounterLedger,
  focus: CounterFocus,
): CounterVisitQrView {
  const translate = useTranslate()
  const { print } = usePrint()
  const origin = useRequestURL().origin

  const action = computed<CounterAction | null>(() =>
    program.state.value.status === 'success' ? counterActionFor(program.state.value.value.rules) : null,
  )
  const rewardTitle = computed(() => (program.state.value.status === 'success' ? program.state.value.value.reward.title : ''))
  const issueText = computed(() => toVisitQrIssueText(action.value, Number(control.amount.value), translate))
  const errorCode = computed(() => (control.state.value.status === 'error' ? control.state.value.code : null))

  const showing = computed(() => (control.state.value.status === 'showing' ? control.state.value : null))
  const token = computed(() => showing.value?.token ?? null)
  // O desenho só muda com o token: a contagem e a consulta trocam o resto a cada segundo.
  const qrCode = computed(() => (token.value === null ? null : toVisitQrCode(origin, token.value)))
  const display = computed(() => {
    const current = showing.value
    if (current === null || qrCode.value === null) return null
    const input = { qr: current.qr, qrCode: qrCode.value, remainingSeconds: control.remaining.value, rewardTitle: rewardTitle.value }
    return toVisitQrDisplayModel(input, new Date(), translate)
  })

  // Os botões trocam de lugar com o estado: o foco só vale depois do DOM atualizado.
  async function focusAfterRender(target: CounterFocusTarget): Promise<void> {
    await nextTick()
    focus(target)
  }

  let focusedOnLoad = false
  watch(
    action,
    (current) => {
      if (current === null || focusedOnLoad) return
      focusedOnLoad = true
      void focusAfterRender(initialFocusTarget(current))
    },
    { immediate: true },
  )

  watch(
    () => showing.value?.qr.claim?.entry ?? null,
    (entry) => {
      if (entry !== null) ledger.prepend(entry)
    },
  )

  watch(
    () => showing.value?.qr.status ?? null,
    (status, previous) => {
      if (previous === 'active' && status !== null && status !== 'active') void focusAfterRender('issueVisitQr')
    },
  )

  async function issue(): Promise<void> {
    const current = action.value
    if (current === null) return
    await control.issue(current)
    if (errorCode.value === 'invalidAmount') focus('amount')
  }

  async function issueAnother(): Promise<void> {
    control.reset()
    if (action.value !== null) await focusAfterRender(initialFocusTarget(action.value))
  }

  function inputAmount(value: string | number): void {
    const digits = amountDigits(String(value))
    // Digitar de novo apaga o aviso do valor anterior.
    if (control.state.value.status === 'error') control.reset()
    control.amount.value = digits
  }

  return reactive({
    amountText: computed(() => (control.amount.value === '' ? '' : formatCurrency(Number(control.amount.value)))),
    action,
    issueLabel: computed(() => issueText.value.issueLabel),
    amountHint: computed(() => issueText.value.amountHint),
    amountPreview: computed(() => issueText.value.amountPreview),
    pending: computed(() => control.state.value.status === 'issuing'),
    amountErrorCode: computed(() => (errorCode.value === 'invalidAmount' ? errorCode.value : null)),
    alertCode: computed(() => (errorCode.value === 'invalidAmount' ? null : errorCode.value)),
    programFailed: computed(() => program.state.value.status === 'error'),
    display,
    canSimulate: control.simulateClaim !== null,
    inputAmount,
    issue,
    cancel: control.cancel,
    issueAnother,
    print,
    simulateClaim: async () => control.simulateClaim?.(),
    retryProgram: program.reload,
  })
}
