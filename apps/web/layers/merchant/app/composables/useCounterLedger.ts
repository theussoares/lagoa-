import type { CounterEntry } from '#shared/schemas/visit'
import { ok } from '#shared/types/result'
import type { CounterLedger } from '../types/counter'

export function useCounterLedger(): CounterLedger {
  const { counter } = useMerchantServices()
  const truncated = shallowRef(false)
  const { state, reload, set } = useAsyncResult(async () => {
    const today = await counter.listTodayEntries()
    if (!today.ok) return today
    truncated.value = today.value.truncated
    return ok(today.value.entries)
  })
  const freshIds = shallowRef<ReadonlySet<string>>(new Set())

  function prepend(entry: CounterEntry): void {
    freshIds.value = new Set([...freshIds.value, entry.id])
    const current = state.value.status === 'success' ? state.value.value : []
    set([entry, ...current.filter((item) => item.id !== entry.id)])
  }

  return { state, truncated, freshIds, reload, prepend }
}
