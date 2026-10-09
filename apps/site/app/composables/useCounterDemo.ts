import type { CounterDemo, CounterDemoFocusTarget, CounterDemoMode, CounterDemoReceiptModel, CounterDemoStage } from '../types/counterDemo'
import { demoVisitCode } from '../utils/demoCode'
import { sanitizeAmount, stampReceipt, valueReceipt } from '../utils/demoReceipt'
import { qrPath } from '#layers/ui/app/utils/qrPath'

const DEMO_QR_CONTENT = 'lagoa-mais-demo'
const DEFAULT_AMOUNT = '50'

/**
 * Demonstração do Balcão. Tudo na memória da página: nada é enviado nem salvo,
 * e o QR é só ilustração (conteúdo fixo, não vale no app).
 */
export function useCounterDemo(): CounterDemo {
  const { t } = useI18n()
  const mode = ref<CounterDemoMode>('stamp')
  const amountText = ref(DEFAULT_AMOUNT)
  const amount = computed<string>({ get: () => amountText.value, set: (value) => { amountText.value = sanitizeAmount(value) } })
  const stage = ref<CounterDemoStage>('idle')
  const showError = ref(false)
  const { request: focusRequest, focus } = useFocusRequest<CounterDemoFocusTarget>()

  const reais = computed(() => Number(amountText.value))

  const receipt = computed<CounterDemoReceiptModel | null>(() => {
    if (stage.value !== 'scanned') return null
    return mode.value === 'stamp' ? stampReceipt(t) : valueReceipt(reais.value, t)
  })

  function generate(): void {
    if (mode.value === 'value' && reais.value < 1) {
      showError.value = true
      focus('amount')
      return
    }
    showError.value = false
    stage.value = 'issued'
    focus('simulate')
  }

  function simulate(): void {
    stage.value = 'scanned'
    focus('restart')
  }

  function restart(): void {
    stage.value = 'idle'
    showError.value = false
    focus('generate')
  }

  return { mode, amount, stage, showError, qr: qrPath(DEMO_QR_CONTENT), code: demoVisitCode(), receipt, focusRequest, generate, simulate, restart }
}
