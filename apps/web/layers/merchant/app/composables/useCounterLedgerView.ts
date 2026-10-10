import type { CounterLedger, CounterLedgerView } from '../types/counter'
import { toCounterLedgerModel } from '../utils/counterModels'

/** Caderneta do dia: estado, linhas prontas para exibir e recarregar. */
export function useCounterLedgerView(ledger: CounterLedger): CounterLedgerView {
  const translate = useTranslate()

  return reactive({
    status: computed(() => ledger.state.value.status),
    errorCode: computed(() => (ledger.state.value.status === 'error' ? ledger.state.value.error.code : null)),
    rows: computed(() =>
      ledger.state.value.status === 'success'
        ? ledger.state.value.value.map((entry) => toCounterLedgerModel(entry, translate, ledger.freshIds.value.has(entry.id)))
        : [],
    ),
    truncated: computed(() => ledger.truncated.value),
    reload: ledger.reload,
  })
}
