import type { VibrationPattern } from '../types/browser'

/** Vibração do aparelho; não faz nada onde o navegador não oferece. */
export function useHaptics(): { vibrate: (pattern: VibrationPattern) => void } {
  function vibrate(pattern: VibrationPattern): void {
    if (!import.meta.client) return
    navigator.vibrate?.(typeof pattern === 'number' ? pattern : [...pattern])
  }

  return { vibrate }
}
