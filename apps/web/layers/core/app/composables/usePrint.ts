/** Abre a impressão do navegador (cartaz do balcão). */
export function usePrint(): { print: () => void } {
  function print(): void {
    if (import.meta.client) window.print()
  }

  return { print }
}
