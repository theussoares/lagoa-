import type { Program } from '#shared/schemas/program'
import type { TransportError } from '#shared/types/errors'
import { formatCurrency } from '#shared/utils/currency'
import { phoneDigits } from '#shared/utils/phone'
import type { AsyncResult } from '#layers/core/app/types/asyncResult'
import { amountDigits, counterActionFor } from '../utils/counterAction'
import { toLaunchFormText, toLaunchReceipt } from '../utils/counterModels'
import type { CounterAction, CounterField, CounterFocus, CounterLaunch, CounterLaunchView, CounterLedger } from '../types/counter'

/** Formulário de lançamento do Balcão: o que o botão faz, os campos, os erros e quando focar. */
export function useCounterLaunchForm(
  program: AsyncResult<Program, TransportError>,
  launch: CounterLaunch,
  ledger: CounterLedger,
  focus: CounterFocus,
): CounterLaunchView {
  const translate = useTranslate()
  const activeField = ref<CounterField>('phone')

  const action = computed<CounterAction | null>(() =>
    program.state.value.status === 'success' ? counterActionFor(program.state.value.value.rules) : null,
  )
  const rewardTitle = computed(() => (program.state.value.status === 'success' ? program.state.value.value.reward.title : ''))
  const formText = computed(() => toLaunchFormText(action.value, translate))
  const errorCode = computed(() => (launch.state.value.status === 'error' ? launch.state.value.code : null))

  const receipt = computed(() => {
    const state = launch.state.value
    if (state.status !== 'success') return null
    return { key: state.result.entry.id, model: toLaunchReceipt(state.result, rewardTitle.value, translate) }
  })

  function focusField(field: CounterField): void {
    activeField.value = field
    focus(field)
  }

  function pressDigit(digit: string): void {
    if (activeField.value === 'amount') launch.amount.value = amountDigits(launch.amount.value + digit)
    else launch.phone.value = phoneDigits(launch.phone.value + digit)
  }

  function pressBackspace(): void {
    if (activeField.value === 'amount') launch.amount.value = launch.amount.value.slice(0, -1)
    else launch.phone.value = launch.phone.value.slice(0, -1)
  }

  async function submit(): Promise<void> {
    const current = action.value
    if (current === null) return
    // Enter no celular, com o valor ainda vazio, só passa para o campo do valor.
    if (current.kind === 'amount' && launch.amount.value === '' && activeField.value === 'phone') {
      focusField('amount')
      return
    }
    const result = await launch.submit(current)
    if (result !== null) ledger.prepend(result.entry)
    if (result !== null || errorCode.value === 'invalidPhone') focusField('phone')
  }

  function clear(): void {
    launch.clear()
    focusField('phone')
  }

  return reactive({
    phone: launch.phone,
    amountText: computed(() => (launch.amount.value === '' ? '' : formatCurrency(Number(launch.amount.value)))),
    action,
    submitLabel: computed(() => formText.value.submitLabel),
    amountHint: computed(() => formText.value.amountHint),
    pending: computed(() => launch.state.value.status === 'pending'),
    phoneErrorCode: computed(() => (errorCode.value === 'invalidPhone' ? errorCode.value : null)),
    amountErrorCode: computed(() => (errorCode.value === 'invalidAmount' ? errorCode.value : null)),
    alertCode: computed(() => (errorCode.value === 'invalidPhone' || errorCode.value === 'invalidAmount' ? null : errorCode.value)),
    programFailed: computed(() => program.state.value.status === 'error'),
    receipt,
    setActiveField: (field: CounterField) => {
      activeField.value = field
    },
    inputAmount: (value: string | number) => {
      launch.amount.value = amountDigits(String(value))
    },
    pressDigit,
    pressBackspace,
    clear,
    submit,
    retryProgram: program.reload,
  })
}
