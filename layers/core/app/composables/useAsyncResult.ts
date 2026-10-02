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

  async function reload(): Promise<void> {
    state.value = { status: 'loading' }
    const result = await load()
    state.value = result.ok ? { status: 'success', value: result.value } : { status: 'error', error: result.error }
  }

  function set(value: T): void {
    state.value = { status: 'success', value }
  }

  onMounted(reload)
  return { state: computed(() => state.value), reload, set }
}
