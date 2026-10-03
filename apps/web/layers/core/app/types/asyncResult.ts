import type { ComputedRef } from 'vue'

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
