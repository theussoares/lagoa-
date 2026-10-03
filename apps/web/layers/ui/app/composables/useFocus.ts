import type { Ref } from 'vue'
import type { FocusRequest } from '../types/focus'

/** No composable de tela: decide QUANDO focar. */
export function useFocusRequest<T extends string>(): { request: Readonly<Ref<FocusRequest<T> | null>>; focus: (target: T) => void } {
  const request = shallowRef<FocusRequest<T> | null>(null)
  let nextId = 0

  function focus(target: T): void {
    nextId += 1
    request.value = { target, id: nextId }
  }

  return { request, focus }
}

/** No componente: decide COMO focar (depois do DOM atualizado). */
export function useFocusTarget<T extends string>(request: () => FocusRequest<T> | null, target: T, focus: () => void): void {
  watch(
    request,
    (current) => {
      if (current?.target === target) focus()
    },
    { flush: 'post' },
  )
}

function elementOf(instance: unknown): HTMLElement | null {
  if (instance instanceof HTMLElement) return instance
  if (typeof instance !== 'object' || instance === null || !('$el' in instance)) return null
  return instance.$el instanceof HTMLElement ? instance.$el : null
}

/** Foca o primeiro `<input>` dentro de um componente ou elemento. */
export function focusFirstInput(instance: unknown): void {
  elementOf(instance)?.querySelector('input')?.focus()
}

/** Foca o primeiro elemento da página que casa com o seletor. */
export function focusFirstMatching(selector: string): void {
  if (!import.meta.client) return
  const match = document.querySelector(selector)
  if (match instanceof HTMLElement) match.focus()
}
