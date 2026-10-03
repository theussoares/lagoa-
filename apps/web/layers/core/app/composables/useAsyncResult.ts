import { computed, onMounted, shallowRef } from 'vue'
import type { ComputedRef } from 'vue'
import type { Result } from '#shared/types/result'

export type AsyncResultState<T, E> =
  | { status: 'loading' }
  | { status: 'error'; error: E }
  | { status: 'success'; value: T }

export interface AsyncResult<T, E> {
  state: ComputedRef<AsyncResultState<T, E>>
  reload: () => Promise<void>
  /** Troca o valor depois de uma escrita que já devolveu o dado novo. */
  set: (value: T) => void
}

/** Carrega um service ao montar e expõe o estado como união discriminada. */
export function useAsyncResult<T, E>(load: () => Promise<Result<T, E>>): AsyncResult<T, E> {
  const state = shallowRef<AsyncResultState<T, E>>({ status: 'loading' })
  let latestRequest = 0

  async function reload(): Promise<void> {
    const request = ++latestRequest
    state.value = { status: 'loading' }
    const result = await load()
    // Uma resposta antiga (filtro trocado no meio do caminho) não sobrescreve a mais nova.
    if (request !== latestRequest) return
    state.value = result.ok ? { status: 'success', value: result.value } : { status: 'error', error: result.error }
  }

  function set(value: T): void {
    state.value = { status: 'success', value }
  }

  onMounted(reload)
  return { state: computed(() => state.value), reload, set }
}
