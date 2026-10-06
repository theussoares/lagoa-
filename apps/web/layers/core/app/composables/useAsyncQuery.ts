import { computed } from 'vue'
import { ok, type Result } from '#shared/types/result'
import type { AsyncResult, AsyncResultState } from '../types/asyncResult'

/**
 * Carrega um service já no servidor (SSR) e entrega o resultado no payload; no navegador só refaz quando
 * pedem. `key` identifica o dado no payload (um por consulta). Para telas só-cliente, `useAsyncResult`.
 */
export function useAsyncQuery<T, E>(key: string, load: () => Promise<Result<T, E>>): AsyncResult<T, E> {
  const { data, status, refresh } = useAsyncData(key, load, { deep: false })

  const state = computed<AsyncResultState<T, E>>(() => {
    const result = data.value
    if (result === undefined || status.value === 'pending') return { status: 'loading' }
    return result.ok ? { status: 'success', value: result.value } : { status: 'error', error: result.error }
  })

  return {
    state,
    reload: () => refresh(),
    set: (value) => {
      data.value = ok(value)
    },
  }
}
