import type { ShallowRef } from 'vue'

/** Mantém o cursor do campo no fim: o visor do celular só cresce para a direita. */
export function useInputCaret(input: Readonly<ShallowRef<HTMLInputElement | null>>): { focus(): void; caretToEnd(): void } {
  function caretToEnd(): void {
    const element = input.value
    if (element === null) return
    element.setSelectionRange(element.value.length, element.value.length)
  }

  function focus(): void {
    input.value?.focus()
    caretToEnd()
  }

  return { focus, caretToEnd }
}
