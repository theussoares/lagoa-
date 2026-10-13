import { ownsHorizontalGesture, swipeTarget } from '../utils/swipeNavigation'

interface TouchStart {
  readonly x: number
  readonly y: number
  readonly at: number
  readonly owned: boolean
}

/** Troca de aba deslizando o dedo para o lado, na ordem da barra de baixo. `touchstart`/`touchend` ficam só aqui. */
export function useSwipeNavigation(paths: () => readonly string[]): void {
  const route = useRoute()
  let start: TouchStart | null = null

  function onStart(event: TouchEvent): void {
    // Dois dedos é pinça (zoom), não troca de aba.
    const touch = event.touches.length === 1 ? event.touches[0] : undefined
    start = touch === undefined ? null : { x: touch.clientX, y: touch.clientY, at: Date.now(), owned: ownsHorizontalGesture(event.target instanceof Element ? event.target : null) }
  }

  async function onEnd(event: TouchEvent): Promise<void> {
    const begun = start
    start = null
    const touch = event.changedTouches[0]
    if (begun === null || begun.owned || touch === undefined) return
    const target = swipeTarget(paths(), route.path, { dx: touch.clientX - begun.x, dy: touch.clientY - begun.y, durationMs: Date.now() - begun.at })
    if (target !== null) await navigateTo(target)
  }

  onMounted(() => {
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchend', onEnd, { passive: true })
  })
  onBeforeUnmount(() => {
    document.removeEventListener('touchstart', onStart)
    document.removeEventListener('touchend', onEnd)
  })
}
