import type { SwipeMove } from '../types/swipe'

/** Deslize mínimo (px) para trocar de aba; menos que isso é toque ou rolagem. */
export const SWIPE_MIN_DISTANCE_PX = 70
/** O gesto precisa ser mais horizontal que vertical, senão é rolagem da página. */
export const SWIPE_HORIZONTAL_RATIO = 1.6
/** Deslize lento é arrastar para ler ou selecionar, não troca de aba. */
export const SWIPE_MAX_DURATION_MS = 600

function currentIndex(paths: readonly string[], currentPath: string): number {
  return paths.findIndex((path) => currentPath === path || currentPath.startsWith(`${path}/`))
}

/** Aba para onde o deslize leva: para a esquerda, a próxima; para a direita, a anterior. `null` = não é troca de aba. */
export function swipeTarget(paths: readonly string[], currentPath: string, move: SwipeMove): string | null {
  const { dx, dy, durationMs } = move
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO || durationMs > SWIPE_MAX_DURATION_MS) return null
  const index = currentIndex(paths, currentPath)
  if (index === -1) return null
  return paths[dx < 0 ? index + 1 : index - 1] ?? null
}

/** Quem tem rolagem ou entrada de texto própria no sentido horizontal fica com o gesto. */
export function ownsHorizontalGesture(element: Element | null): boolean {
  for (let node = element; node !== null; node = node.parentElement) {
    if (node.matches('input, textarea, select, [role="dialog"], [data-no-swipe]')) return true
    const scrollsSideways = node.scrollWidth > node.clientWidth && ['auto', 'scroll'].includes(getComputedStyle(node).overflowX)
    if (scrollsSideways) return true
  }
  return false
}
